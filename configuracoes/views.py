from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
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
from .models import Convenio, DadosClinica, ConfiguracaoSistema, Medicamento, Exame, Cid
from agendamento.models import Agendamento

# Imports dos Serializers
from .serializers import ConvenioSerializer, DadosClinicaSerializer, ConfiguracaoSistemaSerializer, MedicamentoSerializer, ExameSerializer, CidSerializer
from .importacao import importar_medicamentos
from .services.exames_import_service import importar_exames
from .services.cids_import_service import importar_cids
from clinica_core.filters import AccentInsensitiveSearchFilter

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
    filter_backends = [AccentInsensitiveSearchFilter]
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


class MedicamentoViewSet(viewsets.ModelViewSet):
    queryset = Medicamento.objects.all().order_by('nome')
    serializer_class = MedicamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [AccentInsensitiveSearchFilter]
    search_fields = ['nome', 'principio_ativo', 'apresentacao', 'laboratorio', 'tarja', 'nome_busca']

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

        situacao = self._parse_bool(params.get('situacao'))
        if situacao is not None:
            qs = qs.filter(situacao=situacao)

        nome = params.get('nome')
        if nome:
            qs = qs.filter(nome__icontains=nome)

        principio_ativo = params.get('principio_ativo')
        if principio_ativo:
            qs = qs.filter(principio_ativo__icontains=principio_ativo)

        laboratorio = params.get('laboratorio')
        if laboratorio:
            qs = qs.filter(laboratorio__icontains=laboratorio)

        tarja = params.get('tarja')
        if tarja:
            qs = qs.filter(tarja__icontains=tarja)

        return qs

    def _has_movimentacoes(self, medicamento):
        for rel in medicamento._meta.related_objects:
            accessor = rel.get_accessor_name()
            try:
                manager = getattr(medicamento, accessor)
            except Exception:
                continue
            try:
                if manager.exists():
                    return True
            except Exception:
                continue
        return False

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if self._has_movimentacoes(instance):
            return Response(
                {'error': 'Medicamento possui movimentacoes. Use a inativacao.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def inativar(self, request, pk=None):
        medicamento = self.get_object()
        medicamento.situacao = False
        medicamento.save(update_fields=['situacao'])
        return Response({'status': 'inativado'})


class ExameViewSet(viewsets.ModelViewSet):
    queryset = Exame.objects.all().order_by('nome')
    serializer_class = ExameSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [AccentInsensitiveSearchFilter]
    search_fields = ['codigo_tuss', 'nome', 'tipo', 'search_text']

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

        situacao = self._parse_bool(params.get('situacao'))
        if situacao is not None:
            qs = qs.filter(situacao=situacao)

        codigo_tuss = params.get('codigo_tuss')
        if codigo_tuss:
            qs = qs.filter(codigo_tuss__icontains=codigo_tuss)

        nome = params.get('nome')
        if nome:
            qs = qs.filter(nome__icontains=nome)

        tipo = params.get('tipo')
        if tipo:
            qs = qs.filter(tipo__icontains=tipo)

        return qs

    def _has_movimentacoes(self, exame):
        for rel in exame._meta.related_objects:
            accessor = rel.get_accessor_name()
            try:
                manager = getattr(exame, accessor)
            except Exception:
                continue
            try:
                if manager.exists():
                    return True
            except Exception:
                continue
        return False

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if self._has_movimentacoes(instance):
            return Response(
                {'error': 'Exame possui movimentacoes. Use a inativacao.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def inativar(self, request, pk=None):
        exame = self.get_object()
        exame.situacao = False
        exame.save(update_fields=['situacao'])
        return Response({'status': 'inativado'})


class CidViewSet(viewsets.ModelViewSet):
    queryset = Cid.objects.all().order_by('codigo')
    serializer_class = CidSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [AccentInsensitiveSearchFilter]
    search_fields = ['codigo', 'nome', 'search_text']

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

        situacao = self._parse_bool(params.get('situacao'))
        if situacao is not None:
            qs = qs.filter(situacao=situacao)
        else:
            qs = qs.filter(situacao=True)

        codigo = params.get('codigo')
        if codigo:
            qs = qs.filter(codigo__icontains=codigo)

        nome = params.get('nome')
        if nome:
            qs = qs.filter(nome__icontains=nome)

        return qs

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'CID nao pode ser excluido. Use a inativacao.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def inativar(self, request, pk=None):
        cid = self.get_object()
        cid.situacao = False
        cid.save(update_fields=['situacao'])
        return Response({'status': 'inativado'})

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


class ImportacaoTabelasView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        tipo = request.data.get('tipo')
        arquivo = request.FILES.get('arquivo')

        if not tipo:
            return Response({'error': 'Tipo de importacao nao informado.'}, status=status.HTTP_400_BAD_REQUEST)
        if not arquivo:
            return Response({'error': 'Arquivo nao informado.'}, status=status.HTTP_400_BAD_REQUEST)

        handlers = {
            'medicamentos': importar_medicamentos,
            'exames': importar_exames,
            'cids': importar_cids,
        }
        handler = handlers.get(tipo)
        if not handler:
            return Response({'error': 'Tipo de importacao nao suportado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resultado = handler(arquivo)
        except Exception as exc:
            return Response(
                {'error': 'Falha ao processar importacao.', 'detalhe': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'status': 'sucesso',
            'tipo': tipo,
            'resultado': resultado
        })


class ImportacaoCidsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        arquivo = request.FILES.get('arquivo')
        if not arquivo:
            return Response({'error': 'Arquivo nao informado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resultado = importar_cids(arquivo)
        except Exception as exc:
            return Response(
                {'error': 'Falha ao processar importacao de CIDs.', 'detalhe': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'status': 'sucesso',
            'tipo': 'cids',
            'resultado': resultado
        })

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
            f"{base_url}/instance/connectionState/{instance}"
        ]

        last_error = None
        for url in endpoints:
            try:
                response = requests.get(url, headers=headers, timeout=8)
            except requests.RequestException as exc:
                last_error = {'url': url, 'message': str(exc)}
                continue

            if response.status_code not in [200, 201]:
                last_error = f"{url} -> {response.status_code}: {response.text}"
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
