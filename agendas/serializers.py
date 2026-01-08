from rest_framework import serializers
from django.apps import apps
from .models import AgendaConfig

class AgendaConfigSerializer(serializers.ModelSerializer):
    nome_profissional = serializers.CharField(source='profissional.nome', read_only=True)
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    nome_dia = serializers.CharField(source='get_dia_semana_display', read_only=True)
    
    # --- CORREÇÃO: Renomeado para 'convenio_nome' para bater com o Frontend ---
    convenio_nome = serializers.SerializerMethodField()
    
    dias_vinculados = serializers.SerializerMethodField()
    horarios_fixos_detalhes = serializers.SerializerMethodField()
    total_agendados = serializers.SerializerMethodField()

    class Meta:
        model = AgendaConfig
        fields = '__all__'

    # O método precisa chamar get_ + nome_do_campo
    def get_convenio_nome(self, obj):
        if obj.convenio:
            return obj.convenio.nome
        return None # Retorna null para não mostrar nada no card se for livre

    def get_dias_vinculados(self, obj):
        dias = AgendaConfig.objects.filter(group_id=obj.group_id).values_list('dia_semana', flat=True)
        return sorted(list(set(dias)))

    def get_horarios_fixos_detalhes(self, obj):
        if obj.tipo != 'fixo':
            return []
        
        itens = AgendaConfig.objects.filter(group_id=obj.group_id).values('hora_inicio', 'quantidade_atendimentos')
        unicos = []
        seen = set()
        
        for i in itens:
            chave = str(i['hora_inicio'])
            if chave not in seen:
                unicos.append({
                    'time': i['hora_inicio'], 
                    'qtd': i['quantidade_atendimentos']
                })
                seen.add(chave)
        return sorted(unicos, key=lambda x: str(x['time']))

    def get_total_agendados(self, obj):
        try:
            Agendamento = apps.get_model('agendamento', 'Agendamento')
            target_day = obj.dia_semana + 1 

            return Agendamento.objects.filter(
                profissional=obj.profissional,
                data__range=(obj.data_inicio, obj.data_fim),
                data__week_day=target_day,
                status__in=['agendado', 'confirmado', 'concluido']
            ).count()
        except Exception:
            return 0