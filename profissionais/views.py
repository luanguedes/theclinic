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