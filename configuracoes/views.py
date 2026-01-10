from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Convenio, DadosClinica, ConfiguracaoSistema
from .serializers import ConvenioSerializer, DadosClinicaSerializer, ConfiguracaoSistemaSerializer

class ConvenioViewSet(viewsets.ModelViewSet):
    queryset = Convenio.objects.all().order_by('nome')
    serializer_class = ConvenioSerializer
    # Garante que a API exija o login
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome']

class DadosClinicaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dados = DadosClinica.load()
        return Response(DadosClinicaSerializer(dados).data)

    def put(self, request):
        dados = DadosClinica.load()
        serializer = DadosClinicaSerializer(dados, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConfiguracaoSistemaView(APIView):
    permission_classes = [permissions.IsAdminUser] # Apenas Admin pode mexer aqui

    def get(self, request):
        config = ConfiguracaoSistema.load()
        serializer = ConfiguracaoSistemaSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        config = ConfiguracaoSistema.load()
        serializer = ConfiguracaoSistemaSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)