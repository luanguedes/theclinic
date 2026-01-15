from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Especialidade, Profissional
from .serializers import EspecialidadeSerializer, ProfissionalSerializer

class EspecialidadeViewSet(viewsets.ModelViewSet):
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

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
