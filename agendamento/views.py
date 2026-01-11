from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Case, When, Value, IntegerField
from django.db import transaction 
from datetime import date
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
        
        # Busca agendamentos que coincidem com o período do bloqueio
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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome', 'profissional__nome', 'paciente__cpf']

    def perform_create(self, serializer):
        """
        Ao criar um agendamento via POST, salva no banco e
        dispara a mensagem em uma thread separada.
        """
        agendamento = serializer.save()
        threading.Thread(target=enviar_mensagem_agendamento, args=(agendamento,)).start()

    def get_queryset(self):
        queryset = Agendamento.objects.all()

        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return queryset

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

        queryset = queryset.annotate(
            prioridade_status=Case(
                When(status='agendado', then=Value(1)),
                When(status='aguardando', then=Value(2)),
                When(status='em_atendimento', then=Value(3)),
                When(status='finalizado', then=Value(4)),
                When(status='cancelado', then=Value(5)),
                When(status='faltou', then=Value(6)),
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