from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Case, When, Value, IntegerField
from django.db import transaction # <--- IMPORTANTE
from datetime import date

from .models import Agendamento
from .serializers import AgendamentoSerializer

# Tenta importar o modelo de Fatura
try:
    from financeiro.models import Fatura
except ImportError:
    Fatura = None

class AgendamentoViewSet(viewsets.ModelViewSet):
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome', 'profissional__nome', 'paciente__cpf']

    def get_queryset(self):
        queryset = Agendamento.objects.all()
        
        profissional = self.request.query_params.get('profissional')
        especialidade = self.request.query_params.get('especialidade')
        data_filtro = self.request.query_params.get('data')

        if profissional and profissional not in ['undefined', 'null', '']:
            queryset = queryset.filter(profissional_id=profissional)
        
        if especialidade and especialidade not in ['undefined', 'null', '']:
            queryset = queryset.filter(especialidade_id=especialidade)
            
        if data_filtro and data_filtro not in ['undefined', 'null', '']:
            queryset = queryset.filter(data=data_filtro)
        else:
            queryset = queryset.filter(data=date.today())

        # Ordenação Complexa
        queryset = queryset.annotate(
            prioridade_status=Case(
                When(status='agendado', then=Value(1)),
                When(status='aguardando', then=Value(2)),
                When(status='em_atendimento', then=Value(3)),
                When(status='finalizado', then=Value(4)),
                When(status='cancelado', then=Value(5)),
                default=Value(10),
                output_field=IntegerField(),
            )
        ).order_by(
            'prioridade_status',
            'horario',
            'paciente__data_nascimento'
        )

        return queryset

    # --- AÇÃO BLINDADA COM TRANSAÇÃO ATÔMICA ---
    @action(detail=True, methods=['post'])
    def confirmar_chegada(self, request, pk=None):
        agendamento = self.get_object()
        
        # Bloqueio de datas futuras
        if agendamento.data > date.today():
             return Response(
                {"error": "Não é possível confirmar a chegada de um agendamento futuro."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Captura dados
        forma_pagamento = request.data.get('forma_pagamento', 'pendente')
        # Tratamento seguro de valor
        valor_req = request.data.get('valor')
        if valor_req == '' or valor_req is None:
            valor_cobrado = agendamento.valor
        else:
            valor_cobrado = valor_req
            
        ja_pagou = request.data.get('pago', False)

        try:
            # USAMOS TRANSACTION.ATOMIC PARA GARANTIR INTEGRIDADE
            with transaction.atomic():
                # 1. Atualiza o Agendamento
                if agendamento.status == 'agendado':
                    agendamento.status = 'aguardando'
                
                # Se veio valor novo, atualiza no agendamento também
                agendamento.valor = valor_cobrado
                agendamento.save()

                # 2. Atualiza ou Cria a Fatura
                if Fatura:
                    Fatura.objects.update_or_create(
                        agendamento=agendamento,
                        defaults={
                            'valor': valor_cobrado,
                            'forma_pagamento': forma_pagamento,
                            'pago': ja_pagou,
                            'data_pagamento': date.today() if ja_pagou else None,
                            'data_vencimento': date.today(), # Agora o campo existe no model!
                            'desconto': 0.00
                        }
                    )
            
            return Response({'status': 'Check-in realizado com sucesso!'}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Erro ao processar check-in: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )