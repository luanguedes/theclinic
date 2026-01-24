from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'CREATE'),
        ('UPDATE', 'UPDATE'),
        ('DELETE', 'DELETE'),
        ('REPORT_VIEW', 'REPORT_VIEW'),
    ]

    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    method = models.CharField(max_length=10, blank=True, default='')
    path = models.CharField(max_length=255, blank=True, default='')
    status_code = models.IntegerField(null=True, blank=True)

    operator = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    operator_username = models.CharField(max_length=150, blank=True, default='')
    operator_name = models.CharField(max_length=150, blank=True, default='')

    app_label = models.CharField(max_length=100, blank=True, default='')
    model_name = models.CharField(max_length=100, blank=True, default='')
    object_id = models.CharField(max_length=64, blank=True, default='')
    object_repr = models.CharField(max_length=255, blank=True, default='')

    summary = models.CharField(max_length=255, blank=True, default='')
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    diff = models.JSONField(null=True, blank=True)

    ip_address = models.CharField(max_length=45, blank=True, default='')
    user_agent = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} {self.app_label}.{self.model_name} {self.object_id}'


class WebhookEvent(models.Model):
    provider = models.CharField(max_length=50, db_index=True)
    instance_name = models.CharField(max_length=100, db_index=True)
    event_type = models.CharField(max_length=100, blank=True, default='')
    payload = models.JSONField(null=True, blank=True)
    received_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f'{self.provider}:{self.instance_name}:{self.event_type}'
