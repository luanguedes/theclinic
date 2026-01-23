from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Especialidade, Profissional, ProfissionalEspecialidade
from .serializers import EspecialidadeSerializer, ProfissionalSerializer
from .utils.cbo_processing import processar_cbo
from .services.cbo_import import importar_cbo

class EspecialidadeViewSet(viewsets.ModelViewSet):
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome', 'codigo', 'codigo_visual', 'search_text']

    def _parse_bool(self, value):
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if normalized in ['1', 'true', 'yes', 'sim']:
            return True
        if normalized in ['0', 'false', 'no', 'nao']:
            return False
        return None

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        status_param = self._parse_bool(params.get('status'))
        if status_param is not None:
            qs = qs.filter(status=status_param)
        else:
            qs = qs.filter(status=True)

        codigo = params.get('codigo')
        if codigo:
            qs = qs.filter(codigo__icontains=codigo)

        nome = params.get('nome')
        if nome:
            qs = qs.filter(nome__icontains=nome)

        esp_id = params.get('id')
        if esp_id:
            qs = qs.filter(id=esp_id)

        return qs

    def list(self, request, *args, **kwargs):
        # Se vier nopage=true, ignora paginação e retorna tudo
        if request.query_params.get('nopage'):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        return super().list(request, *args, **kwargs)

    def _has_movimentacoes(self, especialidade):
        return ProfissionalEspecialidade.objects.filter(especialidade=especialidade).exists()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if self._has_movimentacoes(instance):
            return Response(
                {'error': 'Especialidade possui movimentacoes. Use a inativacao.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def inativar(self, request, pk=None):
        especialidade = self.get_object()
        especialidade.status = False
        especialidade.save(update_fields=['status'])
        return Response({'status': 'inativado'})

class ProfissionalViewSet(viewsets.ModelViewSet):
    queryset = Profissional.objects.all().order_by('nome')
    serializer_class = ProfissionalSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome', 'cpf']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        cpf = params.get('cpf')
        if cpf:
            qs = qs.filter(cpf__icontains=cpf)

        especialidade_id = params.get('especialidade_id')
        if especialidade_id:
            qs = qs.filter(especialidades_vinculo__especialidade_id=especialidade_id).distinct()

        return qs


class CboImportView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        arquivo = request.FILES.get('arquivo')
        if not arquivo:
            return Response({'error': 'Arquivo nao informado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registros = processar_cbo(arquivo)
            resultado = importar_cbo(registros)
        except Exception as exc:
            return Response(
                {'error': 'Falha ao importar CBO.', 'detalhe': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'status': 'sucesso',
            'resultado': resultado
        })
