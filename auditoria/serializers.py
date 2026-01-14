from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'method', 'path', 'status_code',
            'operator', 'operator_username', 'operator_name',
            'app_label', 'model_name', 'object_id', 'object_repr',
            'summary', 'before', 'after', 'diff',
            'ip_address', 'user_agent', 'created_at'
        ]
