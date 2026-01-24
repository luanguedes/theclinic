from django.contrib import admin
from .models import AuditLog, WebhookEvent


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'app_label', 'model_name', 'object_id', 'operator_username', 'created_at')
    search_fields = ('operator_username', 'operator_name', 'app_label', 'model_name', 'object_id', 'summary')
    list_filter = ('action', 'app_label', 'model_name')


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ('provider', 'instance_name', 'event_type', 'received_at')
    search_fields = ('provider', 'instance_name', 'event_type')
    list_filter = ('provider', 'instance_name', 'event_type')
