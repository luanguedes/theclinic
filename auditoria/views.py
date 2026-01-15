from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from clinica_core.pagination import ConfigurablePageNumberPagination
from django.db.models import Q
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AuditLog.objects.all()

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        operator_id = request.query_params.get('operator_id')
        if operator_id:
            qs = qs.filter(operator_id=operator_id)

        path = request.query_params.get('path')
        if path:
            qs = qs.filter(path__icontains=path)

        model_name = request.query_params.get('model')
        if model_name:
            qs = qs.filter(model_name__icontains=model_name)

        app_label = request.query_params.get('app')
        if app_label:
            qs = qs.filter(app_label__icontains=app_label)

        object_id = request.query_params.get('object_id')
        if object_id:
            qs = qs.filter(object_id=str(object_id))

        method = request.query_params.get('method')
        if method:
            qs = qs.filter(method__iexact=method)

        status_code = request.query_params.get('status_code')
        if status_code:
            qs = qs.filter(status_code=status_code)

        start = request.query_params.get('date_start')
        if start:
            qs = qs.filter(created_at__date__gte=start)

        end = request.query_params.get('date_end')
        if end:
            qs = qs.filter(created_at__date__lte=end)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(operator_username__icontains=search) |
                Q(operator_name__icontains=search) |
                Q(path__icontains=search) |
                Q(summary__icontains=search) |
                Q(object_repr__icontains=search) |
                Q(model_name__icontains=search)
            )

        paginator = ConfigurablePageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is None:
            serializer = AuditLogSerializer(qs, many=True)
            return Response(serializer.data)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
