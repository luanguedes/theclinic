from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.parsers import MultiPartParser, FormParser 
from datetime import timedelta, date
from django.utils import timezone

# Imports dos Models
from .models import Convenio, DadosClinica, ConfiguracaoSistema
from agendamento.models import Agendamento

# Imports dos Serializers
from .serializers import ConvenioSerializer, DadosClinicaSerializer, ConfiguracaoSistemaSerializer

# IMPORTANTE: Importar a função de disparo do WhatsApp
try:
    from agendamento.whatsapp import enviar_lembrete_24h
except ImportError:
    # Fallback caso o arquivo não exista ainda, para não quebrar o server
    def enviar_lembrete_24h(agendamento):
        print(f"Simulando envio para {agendamento.id}")
        return True

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
        
        # --- ESTATÍSTICAS DE HOJE ---
        agendamentos_hoje = Agendamento.objects.filter(data=hoje, status='agendado')
        enviados_hoje = agendamentos_hoje.filter(lembrete_enviado=True).count()
        falhas_hoje = agendamentos_hoje.filter(lembrete_enviado=False).count()

        # --- ESTATÍSTICAS DE AMANHÃ ---
        agendamentos_amanha = Agendamento.objects.filter(data=amanha, status='agendado')
        enviados_amanha = agendamentos_amanha.filter(lembrete_enviado=True).count()
        pendentes_amanha = agendamentos_amanha.filter(lembrete_enviado=False).count()
        
        data = serializer.data
        data['stats_hoje'] = {
            'total': agendamentos_hoje.count(),
            'enviados': enviados_hoje,
            'pendentes': falhas_hoje
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
        """
        Executa o disparo manual de lembretes para agendamentos de AMANHÃ.
        Substitui o call_command por lógica direta para evitar erro 500.
        """
        if 'executar_lembretes' not in request.path:
             return Response({'error': 'Endpoint incorreto.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            config = ConfiguracaoSistema.load()
            hoje = date.today()
            amanha = hoje + timedelta(days=1)
            
            # Busca agendamentos de AMANHÃ que são 'agendado' e ainda não enviados
            pendentes = Agendamento.objects.filter(
                data=amanha,
                status='agendado',
                lembrete_enviado=False
            )

            enviados_count = 0
            erros_count = 0

            # Loop de envio direto
            for ag in pendentes:
                try:
                    # Tenta enviar usando sua função utilitária
                    sucesso = enviar_lembrete_24h(ag)
                    
                    if sucesso:
                        ag.lembrete_enviado = True
                        ag.save()
                        enviados_count += 1
                    else:
                        erros_count += 1
                        
                except Exception as e_interno:
                    print(f"Erro ao enviar lembrete agendamento {ag.id}: {e_interno}")
                    erros_count += 1

            # Atualiza a data da última execução para HOJE
            config.data_ultima_execucao_lembrete = hoje
            config.save()

            # --- PREPARA ESTATÍSTICAS ATUALIZADAS PARA O FRONTEND ---
            # Recalcula tudo para a tela atualizar instantaneamente sem F5
            ag_hoje = Agendamento.objects.filter(data=hoje, status='agendado')
            ag_amanha = Agendamento.objects.filter(data=amanha, status='agendado')

            return Response({
                'status': 'sucesso', 
                'mensagem': f'Processo finalizado. {enviados_count} enviados, {erros_count} falhas.',
                'detalhes': {
                    'enviados': enviados_count,
                    'falhas': erros_count
                },
                'ultima_execucao': config.data_ultima_execucao_lembrete,
                'stats_hoje': {
                    'total': ag_hoje.count(),
                    'enviados': ag_hoje.filter(lembrete_enviado=True).count(),
                    'pendentes': ag_hoje.filter(lembrete_enviado=False).count(),
                },
                'stats_amanha': {
                    'total': ag_amanha.count(),
                    'enviados': ag_amanha.filter(lembrete_enviado=True).count(),
                    'pendentes': ag_amanha.filter(lembrete_enviado=False).count(),
                }
            })

        except Exception as e:
            # Captura qualquer erro fatal e retorna 500 com mensagem JSON (não quebra a tela)
            return Response(
                {'error': 'Falha interna ao processar lembretes.', 'detalhe': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )