from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from configuracoes.models import ConfiguracaoSistema


class ConfigurablePageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = None

    def _is_nopage(self, request):
        value = request.query_params.get('nopage')
        if value is None:
            return False
        return str(value).strip().lower() in ['1', 'true', 'yes', 'sim']

    def get_page_size(self, request):
        try:
            size = int(ConfiguracaoSistema.load().itens_por_pagina or 0)
            if size > 0:
                return size
        except Exception:
            pass
        return super().get_page_size(request) or self.page_size

    def paginate_queryset(self, queryset, request, view=None):
        if self._is_nopage(request):
            return None
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        page_size = self.get_page_size(self.request)
        return Response({
            'count': self.page.paginator.count,
            'page_size': page_size,
            'num_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })
