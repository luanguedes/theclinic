from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action # Removi o permission_classes daqui para não confundir
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Case, When, Value, IntegerField
from django.db import transaction 
from datetime import date
from django.conf import settings
import requests
import threading

# Importações do Projeto
from .models import BloqueioAgenda, Agendamento
from .serializers import BloqueioAgendaSerializer, AgendamentoSerializer
from .whatsapp import enviar_mensagem_agendamento

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
        
        conflitos = Agendamento.objects.filter(
            data__range=[bloqueio.data_inicio, bloqueio.data_fim],
            horario__gte=bloqueio.hora_inicio,
            horario__lte=bloqueio.hora_fim
        )
        
        if bloqueio.profissional:
            conflitos = conflitos.filter(profissional=bloqueio.profissional)

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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bloqueio = serializer.save()

        if acao_conflito == 'cancelar':
            prof_id = bloqueio.profissional.id if bloqueio.profissional else None
            conflitos = Agendamento.objects.filter(
                data__range=[bloqueio.data_inicio, bloqueio.data_fim],
                horario__gte=bloqueio.hora_inicio, horario__lte=bloqueio.hora_fim,
                status__in=['agendado', 'aguardando']
            )
            if prof_id: conflitos = conflitos.filter(profissional_id=prof_id)
            conflitos.update(status='cancelado', observacoes=f"Bloqueio: {bloqueio.motivo}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AgendamentoViewSet(viewsets.ModelViewSet):
    queryset = Agendamento.objects.all()
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    # Esta linha abaixo criava o conflito com o decorator de mesmo nome
    permission_classes = [permissions.IsAuthenticated] 
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome', 'profissional__nome', 'paciente__cpf']

    # --- MÉTODO DE TESTE (CORRIGIDO) ---
    # Colocamos o permission_classes DENTRO do action. Isso é o correto.
    @action(detail=False, methods=['get'], permission_classes=[AllowAny]) 
    def testar_conexao(self, request):
        """
        Rota de teste manual: /api/agendamento/testar_conexao/?numero=5511999999999
        """
        numero_destino = request.query_params.get('numero')
        
        if not numero_destino:
            return Response({
                "erro": "Informe um número na URL.",
                "exemplo": "/api/agendamento/testar_conexao/?numero=5511999999999"
            }, status=400)

        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
        payload = {
            "number": numero_destino,
            # CORREÇÃO AQUI: Colocamos o texto DENTRO de um objeto
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
            print(f"Testando envio para {url} com key {settings.EVOLUTION_API_KEY[:5]}...")
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
    # --------------------------------------------

    def perform_create(self, serializer):
        agendamento = serializer.save()
        threading.Thread(target=enviar_mensagem_agendamento, args=(agendamento,)).start()

    def get_queryset(self):
        queryset = Agendamento.objects.all()

        # Se for uma ação de detalhe (editar, deletar, ver um específico), traz tudo, inclusive cancelados.
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return queryset

        
        queryset = queryset.exclude(status='cancelado')
        # ------------------------------------------

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

        # Ordenação
        queryset = queryset.annotate(
            prioridade_status=Case(
                When(status='agendado', then=Value(1)),
                When(status='aguardando', then=Value(2)),
                When(status='em_atendimento', then=Value(3)),
                When(status='finalizado', then=Value(4)),
                When(status='faltou', then=Value(5)), # Faltou aparece, mas com prioridade baixa
                # Cancelado nem entra aqui pois foi excluído lá em cima
                default=Value(10),
                output_field=IntegerField(),
            )
        ).order_by('prioridade_status', 'horario')
        
        return queryset

    @action(detail=True, methods=['post'])
    def reverter_chegada(self, request, pk=None):
        agendamento = self.get_object()
        if agendamento.status not in ['aguardando', 'faltou']:
            return Response({"error": "Apenas 'Aguardando' ou 'Faltou' podem ser revertidos."}, status=400)
        try:
            with transaction.atomic():
                agendamento.status = 'agendado'
                agendamento.save()
                if hasattr(agendamento, 'fatura'): agendamento.fatura.delete()
            return Response({'status': 'Revertido para Agendado!'}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def marcar_falta(self, request, pk=None):
        agendamento = self.get_object()
        if agendamento.status in ['em_atendimento', 'finalizado']:
             return Response({"error": "Paciente já atendido."}, status=400)
        agendamento.status = 'faltou'
        agendamento.save()
        return Response({'status': 'Falta registrada.'}, status=200)

    @action(detail=True, methods=['post'])
    def confirmar_chegada(self, request, pk=None):
        agendamento = self.get_object()
        if agendamento.data > date.today():
             return Response({"error": "Não é possível confirmar data futura."}, status=400)

        forma_pagamento = request.data.get('forma_pagamento', 'pendente')
        valor_req = request.data.get('valor')
        valor_cobrado = valor_req if (valor_req != '' and valor_req is not None) else agendamento.valor
        ja_pagou = request.data.get('pago', False)

        from django.apps import apps
        Fatura = apps.get_model('financeiro', 'Fatura')

        try:
            with transaction.atomic():
                if agendamento.status == 'agendado': agendamento.status = 'aguardando'
                agendamento.valor = valor_cobrado
                agendamento.save()

                if Fatura:
                    Fatura.objects.update_or_create(
                        agendamento=agendamento,
                        defaults={
                            'valor': valor_cobrado, 'forma_pagamento': forma_pagamento,
                            'pago': ja_pagou, 'data_pagamento': date.today() if ja_pagou else None,
                            'data_vencimento': date.today(), 'desconto': 0.00
                        }
                    )
            return Response({'status': 'Check-in realizado!'}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)