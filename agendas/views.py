from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from django.apps import apps
from django.utils import timezone
from .models import AgendaConfig
from .serializers import AgendaConfigSerializer

class AgendaConfigViewSet(viewsets.ModelViewSet):
    serializer_class = AgendaConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = AgendaConfig.objects.all().order_by('dia_semana', 'hora_inicio')

    def get_queryset(self):
        queryset = super().get_queryset()
        hoje = timezone.now().date()
        
        status_param = self.request.query_params.get('status', 'ativos')
        
        if status_param == 'ativos':
            # Traz ativos OU nulos (legado), desde que data final seja válida
            queryset = queryset.filter(
                Q(situacao=True) | Q(situacao__isnull=True),
                data_fim__gte=hoje
            )
        elif status_param == 'encerrados':
            queryset = queryset.filter(Q(situacao=False) | Q(data_fim__lt=hoje))
        
        # --- FILTROS (Só aplicam se vierem preenchidos) ---
        def is_valid(val):
            return val and str(val).strip() != '' and str(val) != 'undefined' and str(val) != 'null'

        if is_valid(self.request.query_params.get('data_inicial')):
            queryset = queryset.filter(data_inicio=self.request.query_params.get('data_inicial'))

        if is_valid(self.request.query_params.get('data_final')):
            queryset = queryset.filter(data_fim=self.request.query_params.get('data_final'))

        # Data Específica (usada no MarcarConsulta para validar vigência)
        if is_valid(self.request.query_params.get('data_especifica')):
            dt = self.request.query_params.get('data_especifica')
            queryset = queryset.filter(data_inicio__lte=dt, data_fim__gte=dt)

        if is_valid(self.request.query_params.get('profissional_id')):
            queryset = queryset.filter(profissional_id=self.request.query_params.get('profissional_id'))
        
        if is_valid(self.request.query_params.get('especialidade_id')):
            queryset = queryset.filter(especialidade_id=self.request.query_params.get('especialidade_id'))

        convenio_id = self.request.query_params.get('convenio_id')
        if is_valid(convenio_id):
            if str(convenio_id) == 'sem_convenio':
                queryset = queryset.filter(convenio__isnull=True)
            else:
                queryset = queryset.filter(convenio_id=convenio_id)
            
        if is_valid(self.request.query_params.get('dia_filtro')):
            queryset = queryset.filter(dia_semana=self.request.query_params.get('dia_filtro'))
            
        if is_valid(self.request.query_params.get('search')):
            term = self.request.query_params.get('search')
            queryset = queryset.filter(
                Q(profissional__nome__icontains=term) | 
                Q(especialidade__nome__icontains=term)
            )

        return queryset

    # --- DADOS PARA FILTROS (Dropdowns) ---
    @action(detail=False, methods=['get'])
    def filters_data(self, request):
        qs = AgendaConfig.objects.all()
        # Filtra apenas o básico para as opções
        status_param = request.query_params.get('status', 'ativos')
        hoje = timezone.now().date()
        if status_param == 'ativos':
             qs = qs.filter(Q(situacao=True) | Q(situacao__isnull=True), data_fim__gte=hoje)
        
        profissionais = qs.values('profissional__id', 'profissional__nome').distinct()
        especialidades = qs.values('especialidade__id', 'especialidade__nome').distinct()
        
        return Response({
            'profissionais': [{'id': p['profissional__id'], 'label': p['profissional__nome']} for p in profissionais],
            'especialidades': [{'id': e['especialidade__id'], 'label': e['especialidade__nome']} for e in especialidades]
        })

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        if request.query_params.get('nopage') or request.query_params.get('todos_os_dias'):
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Agrupamento para visualização limpa
        all_items = queryset.order_by('group_id', 'dia_semana')
        seen_groups = set()
        unique_items = []
        for item in all_items:
            if item.group_id not in seen_groups:
                unique_items.append(item)
                seen_groups.add(item.group_id)
        
        page = self.paginate_queryset(unique_items)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(unique_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='check-conflicts/(?P<group_id>[^/.]+)')
    def check_conflicts(self, request, group_id=None):
        try: Agendamento = apps.get_model('agendamento', 'Agendamento')
        except LookupError: return Response({"count": 0})
        regras = AgendaConfig.objects.filter(group_id=group_id)
        if not regras.exists(): return Response({"count": 0})
        total_afetados = 0
        for regra in regras:
            qs = Agendamento.objects.filter(profissional_id=regra.profissional_id, data__range=(regra.data_inicio, regra.data_fim))
            qs = qs.filter(data__gte=timezone.now().date())
            total_afetados += qs.count()
        return Response({"count": total_afetados})

    @action(detail=False, methods=['put'], url_path='update-group/(?P<group_id>[^/.]+)')
    def update_group(self, request, group_id=None):
        with transaction.atomic():
            regras_antigas = AgendaConfig.objects.filter(group_id=group_id)
            if not regras_antigas.exists(): return Response({"error": "Agenda não encontrada."}, status=status.HTTP_404_NOT_FOUND)
            
            primeira = regras_antigas.first()
            prof = primeira.profissional_id
            spec = primeira.especialidade_id
            
            regras_antigas.delete()
            
            data = request.data
            dias = data.get('dias_semana', [])
            if not dias: raise Exception("Dias obrigatórios")
            
            tipo = data.get('tipo')
            situacao = data.get('situacao', True)
            
            # Tratamento SEGURO do convênio
            c_val = data.get('convenio')
            convenio_id = None
            if c_val and str(c_val).strip() not in ['', 'null', 'undefined', 'None']:
                try: convenio_id = int(c_val)
                except: convenio_id = None

            for dia in dias:
                base = {
                    'group_id': group_id, 'profissional_id': prof, 'especialidade_id': spec,
                    'convenio_id': convenio_id, 'dia_semana': dia,
                    'data_inicio': data['data_inicio'], 'data_fim': data['data_fim'],
                    'valor': data.get('valor', 0), 'tipo': tipo, 'situacao': situacao
                }
                
                if tipo == 'fixo':
                    for h in data.get('lista_horarios', []):
                        AgendaConfig.objects.create(**base, hora_inicio=h['time'], hora_fim=h['time'], intervalo_minutos=0, quantidade_atendimentos=h['qtd'])
                else:
                    AgendaConfig.objects.create(**base, hora_inicio=data['hora_inicio'], hora_fim=data['hora_fim'], intervalo_minutos=data['intervalo_minutos'], quantidade_atendimentos=data.get('quantidade_atendimentos', 1))

            return Response({"message": "OK"})