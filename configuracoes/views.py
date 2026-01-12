from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.parsers import MultiPartParser, FormParser 
from django.core.management import call_command # Importação necessária para o robô
from .models import Convenio, DadosClinica, ConfiguracaoSistema
from .serializers import ConvenioSerializer, DadosClinicaSerializer, ConfiguracaoSistemaSerializer

class ConvenioViewSet(viewsets.ModelViewSet):
    queryset = Convenio.objects.all().order_by('nome')
    serializer_class = ConvenioSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome']

class DadosClinicaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        dados = DadosClinica.load()
        serializer = DadosClinicaSerializer(dados, context={'request': request}) 
        return Response(serializer.data)

    def put(self, request):
        dados = DadosClinica.load()
        serializer = DadosClinicaSerializer(
            dados, 
            data=request.data, 
            partial=True,
            context={'request': request} 
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConfiguracaoSistemaView(APIView):
    permission_classes = [permissions.IsAdminUser] 

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

    def post(self, request):
        """
        Esta função será chamada quando o React enviar um POST para
        /api/configuracoes/sistema/
        """
        # Verifica se na URL veio o comando de executar lembretes
        if 'executar_lembretes' in request.path:
            try:
                call_command('enviar_lembretes')
                
                config = ConfiguracaoSistema.load()
                return Response({
                    'status': 'sucesso', 
                    'ultima_execucao': config.data_ultima_execucao_lembrete
                })
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'error': 'Ação não encontrada'}, status=status.HTTP_404_NOT_FOUND)