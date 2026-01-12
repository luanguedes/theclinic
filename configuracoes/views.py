from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.parsers import MultiPartParser, FormParser 
from django.core.management import call_command
from datetime import timedelta, date
from .models import Convenio, DadosClinica, ConfiguracaoSistema
from agendamento.models import Agendamento
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
        
        # Datas
        hoje = date.today()
        amanha = hoje + timedelta(days=1)
        
        # --- ESTATÍSTICAS DE HOJE (O que já foi enviado) ---
        agendamentos_hoje = Agendamento.objects.filter(data=hoje, status='agendado')
        enviados_hoje = agendamentos_hoje.filter(lembrete_enviado=True).count()
        falhas_hoje = agendamentos_hoje.filter(lembrete_enviado=False).count()

        # --- ESTATÍSTICAS DE AMANHÃ (O que o robô vai processar) ---
        agendamentos_amanha = Agendamento.objects.filter(data=amanha, status='agendado')
        enviados_amanha = agendamentos_amanha.filter(lembrete_enviado=True).count()
        pendentes_amanha = agendamentos_amanha.filter(lembrete_enviado=False).count()
        
        data = serializer.data
        data['stats_hoje'] = {
            'total': agendamentos_hoje.count(),
            'enviados': enviados_hoje,
            'pendentes': falhas_hoje # Estes deveriam ter sido enviados ontem
        }
        data['stats_amanha'] = {
            'total': agendamentos_amanha.count(),
            'enviados': enviados_amanha,
            'pendentes': pendentes_amanha
        }
        
    return Response(data)

    def put(self, request):
        config = ConfiguracaoSistema.load()
        serializer = ConfiguracaoSistemaSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        if 'executar_lembretes' in request.path:
            try:
                call_command('enviar_lembretes')
                config = ConfiguracaoSistema.load()
                
                amanha = date.today() + timedelta(days=1)
                agendamentos_amanha = Agendamento.objects.filter(data=amanha, status='agendado')
                
                avisados = agendamentos_amanha.filter(lembrete_enviado=True).count()
                faltam = agendamentos_amanha.count() - avisados

                return Response({
                    'status': 'sucesso', 
                    'ultima_execucao': config.data_ultima_execucao_lembrete,
                    'stats_lembretes': {
                        'total': agendamentos_amanha.count(),
                        'avisados': avisados,
                        'faltam': faltam
                    }
                })
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'error': 'Ação não permitida'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)