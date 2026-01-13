from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Case, When, Value, IntegerField
from django.db import transaction 
from datetime import date
from django.conf import settings
from django.utils import timezone
import requests
import threading

# Imports locais (Ajuste se o caminho for diferente)
from .models import BloqueioAgenda, Agendamento
from .serializers import BloqueioAgendaSerializer, AgendamentoSerializer
from .whatsapp import enviar_mensagem_agendamento, enviar_mensagem_cancelamento_bloqueio

# --- VIEWSET DE BLOQUEIOS ---
class BloqueioAgendaViewSet(viewsets.ModelViewSet):
    queryset = BloqueioAgenda.objects.all().order_by('-data_inicio')
    serializer_class = BloqueioAgendaSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def verificar_conflitos(self, request):
        data = request.data
        prof_id = data.get('profissional')
        d_ini = data.get('data_inicio')
        d_fim = data.get('data_fim')
        h_ini = data.get('hora_inicio', '00:00')
        h_fim = data.get('hora_fim', '23:59')

        conflitos = Agendamento.objects.filter(
            data__range=[d_ini, d_fim],
            horario__gte=h_ini,
            horario__lte=h_fim,
            status__in=['agendado', 'aguardando']
        )
        if prof_id:
            conflitos = conflitos.filter(profissional_id=prof_id)

        if not conflitos.exists():
            return Response({'conflito': False, 'total': 0, 'pacientes': []})

        dados_pacientes = []
        for c in conflitos:
            dados_pacientes.append({
                'id': c.id, 'paciente_nome': c.paciente.nome,
                'paciente_cpf': c.paciente.cpf, 'paciente_nascimento': c.paciente.data_nascimento,
                'paciente_telefone': c.paciente.telefone, 'medico': c.profissional.nome,
                'data': c.data, 'horario': c.horario
            })

        return Response({'conflito': True, 'total': len(dados_pacientes), 'pacientes': dados_pacientes})

    @action(detail=True, methods=['get'])
    def relatorio(self, request, pk=None):
        bloqueio = self.get_object()
        conflitos = Agendamento.objects.filter(bloqueio_origem=bloqueio)
        
        dados_pacientes = []
        for c in conflitos:
            dados_pacientes.append({
                'id': c.id,
                'paciente_nome': c.paciente.nome,
                'paciente_cpf': c.paciente.cpf,
                'paciente_nascimento': c.paciente.data_nascimento,
                'paciente_telefone': c.paciente.telefone,
                'medico': c.profissional.nome,
                'data': c.data,
                'horario': c.horario,
                'status': c.get_status_display()
            })

        return Response(dados_pacientes)

    def create(self, request, *args, **kwargs):
        acao_conflito = request.data.pop('acao_conflito', 'manter')
        observacao_texto = request.data.get('observacao', '')
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bloqueio = serializer.save()

        if observacao_texto:
            bloqueio.observacao = observacao_texto
            bloqueio.save()

        afetados_response = []

        if acao_conflito == 'cancelar':
            prof_id = bloqueio.profissional.id if bloqueio.profissional else None
            
            conflitos = Agendamento.objects.filter(
                data__range=[bloqueio.data_inicio, bloqueio.data_fim],
                horario__gte=bloqueio.hora_inicio, horario__lte=bloqueio.hora_fim,
                status__in=['agendado', 'aguardando']
            )
            
            if prof_id:
                conflitos = conflitos.filter(profissional_id=prof_id)
            
            for ag in conflitos:
                ag.status = 'cancelado'
                ag.bloqueio_origem = bloqueio
                ag.observacoes = f"Cancelado por bloqueio. Motivo: {bloqueio.observacao or 'Administrativo'}"
                ag.save()
                
                afetados_response.append({
                    'id': ag.id,
                    'paciente_nome': ag.paciente.nome,
                    'paciente_telefone': ag.paciente.telefone,
                    'data': ag.data.strftime('%d/%m/%Y'),
                    'horario': ag.horario.strftime('%H:%M')
                })

        return Response({
            'bloqueio': serializer.data,
            'afetados': afetados_response
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def notificar_cancelados(self, request):
        ids = request.data.get('agendamentos_ids', [])
        motivo = request.data.get('motivo', '')
        
        enviados = 0
        erros = 0
        
        for ag_id in ids:
            try:
                ag = Agendamento.objects.get(id=ag_id)
                enviar_mensagem_cancelamento_bloqueio(ag, motivo)
                enviados += 1
            except Exception as e:
                print(f"Erro no envio ID {ag_id}: {e}")
                erros += 1
                
        return Response({'status': 'Processado', 'enviados': enviados, 'erros': erros})


# --- VIEWSET DE AGENDAMENTOS (AQUI ESTAVAM FALTANDO AS ROTAS) ---
class AgendamentoViewSet(viewsets.ModelViewSet):
    queryset = Agendamento.objects.all()
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome', 'profissional__nome', 'paciente__cpf']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'cancelado'
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Rota de teste do WhatsApp
    @action(detail=False, methods=['get'], permission_classes=[AllowAny]) 
    def testar_conexao(self, request):
        numero_destino = request.query_params.get('numero')
        
        if not numero_destino:
            return Response({
                "erro": "Informe um número na URL.",
                "exemplo": "/api/agendamento/testar_conexao/?numero=5511999999999"
            }, status=400)

        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
        payload = {
            "number": numero_destino,
            "textMessage": {
                "text": "🤖 Teste de Conexão: O Django conseguiu falar com o WhatsApp!"
            },
            "options": {
                "delay": 0,
                "linkPreview": False
            }
        }
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            return Response({
                "status_django": "Enviado",
                "status_code_whatsapp": response.status_code,
                "resposta_whatsapp": response.json() if response.status_code in [200, 201] else response.text,
                "url_usada": url
            })

        except Exception as e:
            return Response({
                "status": "ERRO CRÍTICO NO DJANGO",
                "detalhe": str(e),
                "url_tentada": url
            }, status=500)

    # Envia WhatsApp ao criar (em background)
    def perform_create(self, serializer):
        agendamento = serializer.save()
        threading.Thread(target=enviar_mensagem_agendamento, args=(agendamento,)).start()

    # Filtros Avançados
    def get_queryset(self):
        queryset = Agendamento.objects.all()

        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return queryset

        queryset = queryset.exclude(status='cancelado')

        profissional = self.request.query_params.get('profissional')
        especialidade = self.request.query_params.get('especialidade')
        data_filtro = self.request.query_params.get('data')
        mes_filtro = self.request.query_params.get('mes')
        ano_filtro = self.request.query_params.get('ano')

        if profissional and profissional not in ['undefined', 'null', '']:
            queryset = queryset.filter(profissional_id=profissional)
        if especialidade and especialidade not in ['undefined', 'null', '']:
            queryset = queryset.filter(especialidade_id=especialidade)
        
        if data_filtro and data_filtro not in ['undefined', 'null', '']:
            queryset = queryset.filter(data=data_filtro)
        elif mes_filtro and ano_filtro:
            queryset = queryset.filter(data__month=mes_filtro, data__year=ano_filtro)
        else:
            if not self.request.query_params.get('nopage'): 
                 queryset = queryset.filter(data=date.today())

        # Ordenação por Status (Prioridade na lista da recepção)
        queryset = queryset.annotate(
            prioridade_status=Case(
                When(status='agendado', then=Value(1)),
                When(status='aguardando', then=Value(2)),
                When(status='em_atendimento', then=Value(3)),
                When(status='finalizado', then=Value(4)),
                When(status='faltou', then=Value(5)),
                default=Value(10),
                output_field=IntegerField(),
            )
        ).order_by('prioridade_status', 'horario')
        
        return queryset

    # --- AÇÃO: REVERTER (AGORA INCLUÍDA) ---
    @action(detail=True, methods=['post'])
    def reverter_chegada(self, request, pk=None):
        agendamento = self.get_object()
        # Permite reverter de 'aguardando', 'faltou' e até 'finalizado' se foi erro
        if agendamento.status not in ['aguardando', 'faltou', 'finalizado', 'em_atendimento']:
            return Response({"error": "Status inválido para reversão."}, status=400)
            
        try:
            with transaction.atomic():
                agendamento.status = 'agendado'
                agendamento.horario_chegada = None # Reseta o timer de espera
                agendamento.save()
                
                # Opcional: Se quiser limpar a fatura se não foi paga, descomente:
                # if hasattr(agendamento, 'fatura') and not agendamento.fatura.pago:
                #     agendamento.fatura.delete()
                    
            return Response({'status': 'Revertido para Agendado!'}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # --- AÇÃO: MARCAR FALTA (AGORA INCLUÍDA) ---
    @action(detail=True, methods=['post'])
    def marcar_falta(self, request, pk=None):
        agendamento = self.get_object()
        if agendamento.status in ['em_atendimento', 'finalizado']:
             return Response({"error": "Paciente já atendido."}, status=400)
        agendamento.status = 'faltou'
        agendamento.save()
        return Response({'status': 'Falta registrada.'}, status=200)

    # --- AÇÃO: CONFIRMAR CHEGADA (CHECK-IN COMPLETO) ---
    @action(detail=True, methods=['post'])
    def confirmar_chegada(self, request, pk=None):
        agendamento = self.get_object()
        
        if agendamento.data > date.today():
             return Response({"error": "Não é possível confirmar data futura."}, status=400)

        # Dados vindos do Frontend
        data = request.data
        forma_pagamento = data.get('forma_pagamento', 'pendente')
        valor_req = data.get('valor')
        ja_pagou = data.get('pago', False)
        
        # Garante que valor_cobrado seja um número válido
        valor_cobrado = agendamento.valor
        if valor_req is not None and str(valor_req).strip() != '':
            valor_cobrado = valor_req

        from django.apps import apps
        Fatura = apps.get_model('financeiro', 'Fatura')

        try:
            with transaction.atomic():
                # 1. ATUALIZA DADOS SE MUDOU NA RECEPÇÃO (MÉDICO/ESPECIALIDADE)
                if 'profissional' in data and data['profissional']:
                    agendamento.profissional_id = data['profissional']
                
                if 'especialidade' in data and data['especialidade']:
                    agendamento.especialidade_id = data['especialidade']
                
                if 'convenio' in data:
                    val_conv = data['convenio']
                    agendamento.convenio_id = val_conv if val_conv not in ['', 'null', None] else None
                
                # 2. DEFINE STATUS E HORA
                if agendamento.status == 'agendado': 
                    agendamento.status = 'aguardando'
                    agendamento.horario_chegada = timezone.now().time()
                
                agendamento.valor = valor_cobrado
                agendamento.save()

                # 3. ATUALIZA/CRIA FATURA
                if Fatura:
                    Fatura.objects.update_or_create(
                        agendamento=agendamento,
                        defaults={
                            'paciente': agendamento.paciente,
                            'valor': valor_cobrado, 
                            'forma_pagamento': forma_pagamento,
                            'pago': ja_pagou, 
                            'data_pagamento': date.today() if ja_pagou else None,
                            'data_vencimento': date.today(), 
                            'desconto': 0.00
                        }
                    )
            return Response({'status': 'Check-in realizado!'}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)