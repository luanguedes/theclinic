from django.contrib import admin
from .models import Agendamento

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    # Exibe quem é o paciente, médico, data e status
    list_display = ('paciente', 'profissional', 'data', 'horario', 'status', 'valor')
    
    # Filtros laterais úteis
    list_filter = ('status', 'data', 'profissional', 'convenio')
    
    # Busca por nome do paciente ou do médico
    search_fields = ('paciente__nome', 'profissional__nome', 'observacoes')
    
    # Permite editar a data direto na lista (opcional, cuidado!)
    # list_editable = ('status',)