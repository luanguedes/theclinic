from django.apps import apps
import uuid
from django.db.models.signals import pre_save, post_save, post_delete
from .models import AuditLog
from .utils import get_current_request, get_current_user


_EXCLUDE_APPS = {'admin', 'auth', 'contenttypes', 'sessions', 'messages', 'staticfiles', 'auditoria'}


def _serialize_instance(instance):
    data = {}
    for field in instance._meta.fields:
        name = field.name
        if any(key in name.lower() for key in ['password', 'senha', 'token']):
            data[name] = '***'
            continue
        try:
            if field.is_relation:
                value = getattr(instance, field.attname)
            else:
                value = getattr(instance, name)
        except Exception:
            value = None

        if isinstance(value, uuid.UUID):
            value = str(value)
        elif hasattr(value, 'isoformat'):
            value = value.isoformat()
        elif isinstance(value, (bytes, bytearray)):
            value = None
        data[name] = value
    return data


def _build_diff(before, after):
    diff = {}
    for key, value in after.items():
        if before.get(key) != value:
            diff[key] = {'before': before.get(key), 'after': value}
    return diff


def _get_client_ip(request):
    if not request:
        return ''
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _log_change(action, instance, before=None, after=None, diff=None):
    model_meta = instance._meta
    user = get_current_user()
    request = get_current_request()
    path = request.path if request else ''
    method = request.method if request else ''

    AuditLog.objects.create(
        action=action,
        method=method,
        path=path,
        operator=user if getattr(user, 'is_authenticated', False) else None,
        operator_username=getattr(user, 'username', '') if getattr(user, 'is_authenticated', False) else '',
        operator_name=getattr(user, 'first_name', '') if getattr(user, 'is_authenticated', False) else '',
        app_label=model_meta.app_label,
        model_name=model_meta.model_name,
        object_id=str(instance.pk) if instance.pk else '',
        object_repr=str(instance)[:255],
        summary=f'{action} {model_meta.label} {instance.pk}',
        before=before,
        after=after,
        diff=diff,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255] if request else '',
    )


def _pre_save(sender, instance, **kwargs):
    if sender._meta.app_label in _EXCLUDE_APPS:
        return
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    instance._audit_before = _serialize_instance(old)


def _post_save(sender, instance, created, **kwargs):
    if sender._meta.app_label in _EXCLUDE_APPS:
        return
    after = _serialize_instance(instance)
    if created:
        _log_change('CREATE', instance, before=None, after=after, diff=None)
        return
    before = getattr(instance, '_audit_before', None)
    if before is None:
        before = {}
    diff = _build_diff(before, after)
    if diff:
        _log_change('UPDATE', instance, before=before, after=after, diff=diff)


def _post_delete(sender, instance, **kwargs):
    if sender._meta.app_label in _EXCLUDE_APPS:
        return
    before = _serialize_instance(instance)
    _log_change('DELETE', instance, before=before, after=None, diff=None)


for model in apps.get_models():
    if model._meta.app_label in _EXCLUDE_APPS:
        continue
    pre_save.connect(_pre_save, sender=model, dispatch_uid=f'audit_pre_save_{model._meta.label_lower}')
    post_save.connect(_post_save, sender=model, dispatch_uid=f'audit_post_save_{model._meta.label_lower}')
    post_delete.connect(_post_delete, sender=model, dispatch_uid=f'audit_post_delete_{model._meta.label_lower}')
