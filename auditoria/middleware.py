import re
from .models import AuditLog
from .utils import set_current_request, get_current_request


REPORT_PATH_RE = re.compile(r'(relatorio|relatorios|report|export|download)', re.IGNORECASE)


def _get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        set_current_request(request)
        response = self.get_response(request)

        try:
            if request.method == 'GET' and REPORT_PATH_RE.search(request.path):
                user = getattr(request, 'user', None)
                if user and user.is_authenticated:
                    query = request.META.get('QUERY_STRING', '')
                    suffix = f'?{query}' if query else ''
                    AuditLog.objects.create(
                        action='REPORT_VIEW',
                        method='GET',
                        path=request.path,
                        status_code=response.status_code,
                        operator=user,
                        operator_username=user.username,
                        operator_name=user.first_name or user.username,
                        summary=f'Report view: {request.path}{suffix}'[:255],
                        ip_address=_get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                    )
        finally:
            set_current_request(None)

        return response
