from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Case, When, Value, IntegerField
from datetime import date

# Imports dos Models
from .models import Agendamento
from .serializers import AgendamentoSerializer

# Import seguro do Financeiro (caso o app ainda não esteja 100% configurado)
try:
    from financeiro.models import Fatura
except ImportError:
    Fatura = None

class AgendamentoViewSet(viewsets.ModelViewSet):
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    # Habilita a barra de pesquisa por texto
    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome', 'profissional__nome', 'paciente__cpf']

    def get_queryset(self):
        # Começa com todos os agendamentos
        queryset = Agendamento.objects.all()

        # --- 1. FILTROS DA URL ---
        profissional = self.request.query_params.get('profissional')
        especialidade = self.request.query_params.get('especialidade')
        data_filtro = self.request.query_params.get('data')

        # Filtro de Profissional
        if profissional and profissional not in ['undefined', 'null', '']:
            queryset = queryset.filter(profissional_id=profissional)
        
        # Filtro de Especialidade
        if especialidade and especialidade not in ['undefined', 'null', '']:
            queryset = queryset.filter(especialidade_id=especialidade)
            
        # Filtro de Data (Lógica Inteligente)
        if data_filtro and data_filtro not in ['undefined', 'null', '']:
            # Se o usuário escolheu uma data, usa ela
            queryset = queryset.filter(data=data_filtro)
        else:
            # Se NÃO escolheu data, mostra apenas os de HOJE (Padrão da Recepção)
            # Para ver todos, o front teria que mandar uma flag específica, mas por padrão limpamos a tela
            queryset = queryset.filter(data=date.today())

        # --- 2. ORDENAÇÃO COMPLEXA (A Mágica) ---
        # Regra: Agendado (1) > Aguardando (2) > Em Atendimento (3) > Finalizado (4) > Cancelado (5)
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
            'prioridade_status',       # 1º Critério: Status
            'horario',                 # 2º Critério: Horário (Crescente)
            'paciente__data_nascimento'# 3º Critério: Idade (Data de nascimento menor = Mais velho primeiro)
        )

        return queryset

    # --- AÇÃO DE CHECK-IN (RECEPÇÃO) ---
    @action(detail=True, methods=['post'])
    def confirmar_chegada(self, request, pk=None):
        agendamento = self.get_object()
        
        # Validação: Não confirmar datas futuras
        if agendamento.data > date.today():
             return Response(
                {"error": "Você não pode confirmar a chegada de um agendamento futuro."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Captura dados do Modal
        forma_pagamento = request.data.get('forma_pagamento', 'pendente')
        valor_cobrado = request.data.get('valor', agendamento.valor) # Usa o valor do agendamento se não vier nada
        ja_pagou = request.data.get('pago', False)

        # 2. Atualiza Status do Agendamento
        agendamento.status = 'aguardando'
        agendamento.save()

        # 3. Integração Financeira
        if Fatura:
            Fatura.objects.get_or_create(
                agendamento=agendamento,
                defaults={
                    'valor': valor_cobrado,
                    'forma_pagamento': forma_pagamento,
                    'pago': ja_pagou,
                    # Se ja_pagou for True, definimos a data de pagamento como agora
                    'data_pagamento': date.today() if ja_pagou else None,
                    'data_vencimento': date.today() # Vence no dia da consulta
                }
            )
            msg = 'Paciente confirmado e fatura gerada!'
        else:
            msg = 'Paciente confirmado (Módulo Financeiro não instalado)'

        return Response({'status': msg}, status=status.HTTP_200_OK)