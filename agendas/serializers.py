from rest_framework import serializers
from django.apps import apps
from .models import AgendaConfig

class AgendaConfigSerializer(serializers.ModelSerializer):
    nome_profissional = serializers.CharField(source='profissional.nome', read_only=True)
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    nome_dia = serializers.CharField(source='get_dia_semana_display', read_only=True)
    
    convenio_nome = serializers.SerializerMethodField()
    
    dias_vinculados = serializers.SerializerMethodField()
    horarios_fixos_detalhes = serializers.SerializerMethodField()
    total_agendados = serializers.SerializerMethodField()

    class Meta:
        model = AgendaConfig
        fields = '__all__'

    def get_convenio_nome(self, obj):
        if obj.convenio:
            return obj.convenio.nome
        return None

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

    # --- CORREÇÃO AQUI ---
    def get_total_agendados(self, obj):
        try:
            Agendamento = apps.get_model('agendamento', 'Agendamento')
            
            # Conversão: No Model AgendaConfig 0=Domingo, mas no Django Query __week_day 1=Domingo
            target_day = obj.dia_semana + 1 

            # Conta todos os agendamentos que NÃO foram cancelados dentro do período daquela agenda
            # Isso contabiliza históricos de agendas encerradas também.
            return Agendamento.objects.filter(
                profissional=obj.profissional,
                data__range=(obj.data_inicio, obj.data_fim),
                data__week_day=target_day,
                # Lista atualizada com TODOS os status que contam como "vaga ocupada" ou "paciente atendido"
                status__in=['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou']
            ).count()
        except Exception as e:
            print(f"Erro ao contar agendados: {e}")
            return 0