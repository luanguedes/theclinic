from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Case, When, Value, IntegerField
from django.db import transaction # <--- IMPORTANTE
from datetime import date

from .models import BloqueioAgenda, Agendamento
from .serializers import BloqueioAgendaSerializer, AgendamentoSerializer


class BloqueioAgendaViewSet(viewsets.ModelViewSet):
    queryset = BloqueioAgenda.objects.all().order_by('-data_inicio')
    serializer_class = BloqueioAgendaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    # Endpoint para checar conflitos antes de criar
    @action(detail=False, methods=['post'])
    def verificar_conflitos(self, request):
        data = request.data
        prof_id = data.get('profissional')
        d_ini = data.get('data_inicio')
        d_fim = data.get('data_fim')
        h_ini = data.get('hora_inicio', '00:00')
        h_fim = data.get('hora_fim', '23:59')

        # Filtra agendamentos no período
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

        # Serializa os dados para o relatório PDF
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
                'horario': c.horario
            })

        return Response({
            'conflito': True, 
            'total': len(dados_pacientes), 
            'pacientes': dados_pacientes
        })

    # Sobrescreve o create para lidar com a ação escolhida (cancelar ou manter)
    def create(self, request, *args, **kwargs):
        acao_conflito = request.data.pop('acao_conflito', 'manter') # manter | cancelar
        
        # Cria o bloqueio
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bloqueio = serializer.save()

        # Se escolheu cancelar, cancela os agendamentos afetados
        if acao_conflito == 'cancelar':
            prof_id = bloqueio.profissional.id if bloqueio.profissional else None
            
            conflitos = Agendamento.objects.filter(
                data__range=[bloqueio.data_inicio, bloqueio.data_fim],
                horario__gte=bloqueio.hora_inicio,
                horario__lte=bloqueio.hora_fim,
                status__in=['agendado', 'aguardando']
            )
            
            if prof_id:
                conflitos = conflitos.filter(profissional_id=prof_id)
            
            conflitos.update(status='cancelado', observacoes=f"Cancelado por bloqueio de agenda: {bloqueio.motivo}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AgendamentoViewSet(viewsets.ModelViewSet):
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome', 'profissional__nome', 'paciente__cpf']

    def get_queryset(self):
        queryset = Agendamento.objects.all()

        # --- 1. FILTROS ---
        profissional = self.request.query_params.get('profissional')
        especialidade = self.request.query_params.get('especialidade')
        
        # Filtros de Data
        data_filtro = self.request.query_params.get('data')
        mes_filtro = self.request.query_params.get('mes')
        ano_filtro = self.request.query_params.get('ano')

        if profissional and profissional not in ['undefined', 'null', '']:
            queryset = queryset.filter(profissional_id=profissional)
        
        if especialidade and especialidade not in ['undefined', 'null', '']:
            queryset = queryset.filter(especialidade_id=especialidade)
            
        # Lógica de Data:
        # 1. Se tem data específica, usa ela.
        # 2. Se tem Mês e Ano, filtra pelo mês.
        # 3. Se não tem nada, usa HOJE (padrão).
        
        if data_filtro and data_filtro not in ['undefined', 'null', '']:
            queryset = queryset.filter(data=data_filtro)
        elif mes_filtro and ano_filtro:
            queryset = queryset.filter(data__month=mes_filtro, data__year=ano_filtro)
        else:
            # Se não passou filtro de mês, aplica o padrão de hoje
            # (A menos que queira listar tudo, mas para dashboard o padrão hoje é seguro)
            # Para o Dashboard funcionar sem travar, se não vier nada, NÃO filtramos data aqui,
            # deixamos o frontend mandar os parametros.
            # Mas para manter compatibilidade com outras telas:
            if not self.request.query_params.get('nopage'): 
                 queryset = queryset.filter(data=date.today())

        # --- 2. ORDENAÇÃO ---
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

        # ALTERAÇÃO AQUI: Permite reverter se estiver 'aguardando' OU 'faltou'
        if agendamento.status not in ['aguardando', 'faltou']:
            return Response(
                {"error": "Apenas agendamentos 'Aguardando' ou 'Faltou' podem ser revertidos."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # 1. Volta o status para Agendado
                agendamento.status = 'agendado'
                agendamento.save()

                # 2. Se tiver fatura (caso de 'aguardando'), apaga. 
                # (Se for 'faltou' geralmente não tem fatura, mas o código protege igual)
                if hasattr(agendamento, 'fatura'):
                    agendamento.fatura.delete()

            return Response({'status': 'Status revertido para Agendado!'}, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def marcar_falta(self, request, pk=None):
        agendamento = self.get_object()
        
        # Só permite marcar falta se ainda não foi atendido
        if agendamento.status in ['em_atendimento', 'finalizado']:
             return Response({"error": "Paciente já foi atendido."}, status=status.HTTP_400_BAD_REQUEST)

        agendamento.status = 'faltou'
        agendamento.save()
        
        return Response({'status': 'Falta registrada com sucesso.'}, status=status.HTTP_200_OK)

    # --- AÇÃO BLINDADA COM TRANSAÇÃO ATÔMICA ---
    @action(detail=True, methods=['post'])
    def confirmar_chegada(self, request, pk=None):
        agendamento = self.get_object()
        
        # ... (suas validações de data e valores continuam iguais) ...
        
        # Carrega o Model dinamicamente para evitar erro circular
        from django.apps import apps 
        Fatura = apps.get_model('financeiro', 'Fatura') 

        try:
            with transaction.atomic():
                # ... (atualização do agendamento continua igual) ...
                
                # 2. Atualiza ou Cria a Fatura
                Fatura.objects.update_or_create(
                    agendamento=agendamento,
                    defaults={
                        'valor': valor_cobrado,
                        'forma_pagamento': forma_pagamento,
                        'pago': ja_pagou,
                        'data_pagamento': date.today() if ja_pagou else None,
                        'data_vencimento': date.today(),
                        'desconto': 0.00
                    }
                )
            
            return Response({'status': 'Check-in realizado com sucesso!'}, status=status.HTTP_200_OK)


        except Exception as e:
            return Response(
                {"error": f"Erro ao processar check-in: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )