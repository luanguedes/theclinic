from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.parsers import MultiPartParser, FormParser 
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
import requests
import base64

# Imports dos Models
from .models import Convenio, DadosClinica, ConfiguracaoSistema
from agendamento.models import Agendamento

# Imports dos Serializers
from .serializers import ConvenioSerializer, DadosClinicaSerializer, ConfiguracaoSistemaSerializer

# IMPORTANTE: Importar a funcao de disparo do WhatsApp
try:
    from agendamento.whatsapp import enviar_lembrete_24h
except ImportError:
    # Fallback caso o arquivo nao exista ainda, para nao quebrar o server
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
        ativo = self._parse_bool(self.request.query_params.get('ativo'))
        if ativo is not None:
            qs = qs.filter(ativo=ativo)
        return qs

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
        hoje = timezone.localdate()
        amanha = hoje + timedelta(days=1)
        
        # --- ESTATISTICAS DE HOJE ---
        agendamentos_hoje = Agendamento.objects.filter(data=hoje, status='agendado')
        enviados_hoje = agendamentos_hoje.filter(lembrete_enviado=True).count()
        falhas_hoje = agendamentos_hoje.filter(lembrete_enviado=False).count()

        # --- ESTATISTICAS DE AMANHA ---
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
        Executa o disparo manual de lembretes para agendamentos de AMANHA.
        Substitui o call_command por logica direta para evitar erro 500.
        """
        if 'executar_lembretes' not in request.path:
             return Response({'error': 'Endpoint incorreto.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            config = ConfiguracaoSistema.load()
            hoje = timezone.localdate()
            amanha = hoje + timedelta(days=1)
            
            # Busca agendamentos de AMANHA que sao 'agendado' e ainda nao enviados
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
                    # Tenta enviar usando sua funcao utilitaria
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

            # Atualiza a data da ultima execucao para HOJE
            config.data_ultima_execucao_lembrete = hoje
            config.save()

            # --- PREPARA ESTATISTICAS ATUALIZADAS PARA O FRONTEND ---
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
            # Captura qualquer erro fatal e retorna 500 com mensagem JSON (nao quebra a tela)
            return Response(
                {'error': 'Falha interna ao processar lembretes.', 'detalhe': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def _parse_evolution_state(payload):
    state = None
    if isinstance(payload, dict):
        for key in ['state', 'status', 'connectionStatus', 'connection_state']:
            if isinstance(payload.get(key), str):
                state = payload[key]
                break
        if not state and isinstance(payload.get('instance'), dict):
            for key in ['state', 'status', 'connectionStatus', 'connection_state']:
                if isinstance(payload['instance'].get(key), str):
                    state = payload['instance'][key]
                    break

    connected = None
    if isinstance(payload, dict) and 'connected' in payload:
        connected = bool(payload['connected'])

    if state:
        normalized = state.lower()
        if normalized in ['open', 'connected', 'online', 'ready']:
            connected = True if connected is None else connected
        if normalized in ['close', 'closed', 'disconnected', 'offline', 'error']:
            connected = False if connected is None else connected

    return connected, state or 'desconhecido'


def _extract_qr_payload(payload):
    if isinstance(payload, dict):
        for key in ['base64', 'qrcode', 'qr', 'qrCode', 'qr_code', 'image', 'data']:
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
            if isinstance(value, dict):
                for nested_key in ['base64', 'qrcode', 'qr', 'qrCode', 'qr_code', 'image', 'data']:
                    nested_value = value.get(nested_key)
                    if isinstance(nested_value, str) and nested_value.strip():
                        return nested_value
    if isinstance(payload, str) and payload.strip():
        return payload
    return None


def _normalize_qr_base64(qr_value, content_type="image/png"):
    value = qr_value.strip()
    if value.startswith("data:"):
        parts = value.split(",", 1)
        base64_data = parts[1] if len(parts) == 2 else value
        return base64_data, value
    return value, f"data:{content_type};base64,{value}"


def _has_whatsapp_access(user):
    return bool(user and (getattr(user, 'is_superuser', False) or getattr(user, 'acesso_whatsapp', False)))


class WhatsAppStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _has_whatsapp_access(request.user):
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)
        base_url = getattr(settings, 'EVOLUTION_API_URL', None)
        instance = getattr(settings, 'EVOLUTION_INSTANCE_NAME', None)
        api_key = getattr(settings, 'EVOLUTION_API_KEY', None)

        if not base_url or not instance:
            return Response({
                'connected': None,
                'state': 'config_incompleta',
                'error': 'EVOLUTION_API_URL ou EVOLUTION_INSTANCE_NAME nao configurados.'
            })

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["apikey"] = api_key

        endpoints = [
            f"{base_url}/instance/connectionState/{instance}",
            f"{base_url}/instance/status/{instance}"
        ]

        last_error = None
        for url in endpoints:
            try:
                response = requests.get(url, headers=headers, timeout=8)
            except requests.RequestException as exc:
                last_error = {'url': url, 'message': str(exc)}
                continue

            if response.status_code not in [200, 201]:
                last_error = {'url': url, 'status_code': response.status_code, 'body': response.text}
                continue

            try:
                payload = response.json()
            except ValueError:
                payload = {'raw': response.text}

            connected, state = _parse_evolution_state(payload)
            return Response({
                'connected': connected,
                'state': state,
                'source': url,
                'payload': payload
            })

        return Response({
            'connected': None,
            'state': 'erro',
            'error': last_error or 'Falha ao consultar o Evolution API.'
        })


class WhatsAppQRCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _has_whatsapp_access(request.user):
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)
        debug = request.query_params.get('debug') == '1'
        base_url = getattr(settings, 'EVOLUTION_API_URL', None)
        instance = getattr(settings, 'EVOLUTION_INSTANCE_NAME', None)
        api_key = getattr(settings, 'EVOLUTION_API_KEY', None)

        if not base_url or not instance:
            return Response({
                'error': 'EVOLUTION_API_URL ou EVOLUTION_INSTANCE_NAME nao configurados.'
            }, status=status.HTTP_400_BAD_REQUEST)

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["apikey"] = api_key

        endpoints = [
            f"{base_url}/instance/qrcode/{instance}",
            f"{base_url}/instance/qr/{instance}",
            f"{base_url}/instance/connect/{instance}",
            f"{base_url}/instance/qrcode/{instance}/image",
            f"{base_url}/instance/qr/{instance}/image"
        ]

        last_error = None
        attempts = []
        for url in endpoints:
            try:
                response = requests.get(url, headers=headers, timeout=10)
            except requests.RequestException as exc:
                last_error = {'url': url, 'message': str(exc)}
                attempts.append({'url': url, 'error': str(exc)})
                continue

            if response.status_code not in [200, 201]:
                last_error = {'url': url, 'status_code': response.status_code, 'body': response.text}
                attempts.append({'url': url, 'status_code': response.status_code, 'body': response.text})
                continue

            content_type = response.headers.get('Content-Type', 'application/json')
            if content_type.startswith('image/'):
                base64_data = base64.b64encode(response.content).decode('ascii')
                _, data_uri = _normalize_qr_base64(base64_data, content_type=content_type)
                payload = {
                    'base64': base64_data,
                    'data_uri': data_uri,
                    'source': url
                }
                if debug:
                    payload['attempts'] = attempts
                return Response(payload)

            try:
                payload = response.json()
            except ValueError:
                payload = response.text

            qr_value = _extract_qr_payload(payload)
            if not qr_value:
                last_error = {'url': url, 'message': 'QR code nao encontrado no payload.', 'payload': payload}
                attempts.append({'url': url, 'message': 'QR code nao encontrado no payload.'})
                continue

            base64_data, data_uri = _normalize_qr_base64(qr_value)
            response_payload = {
                'base64': base64_data,
                'data_uri': data_uri,
                'source': url,
                'payload': payload if isinstance(payload, dict) else None
            }
            if debug:
                response_payload['attempts'] = attempts
            return Response(response_payload)

        error_payload = {
            'error': 'Falha ao consultar QR Code no Evolution API.',
            'details': last_error
        }
        if debug:
            error_payload['attempts'] = attempts
        return Response(error_payload, status=status.HTTP_502_BAD_GATEWAY)
