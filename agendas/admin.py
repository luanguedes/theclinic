from django.contrib import admin
from .models import AgendaConfig

@admin.register(AgendaConfig)
class AgendaConfigAdmin(admin.ModelAdmin):
    list_display = ('profissional', 'dia_semana', 'hora_inicio', 'hora_fim', 'tipo')
    list_filter = ('dia_semana', 'tipo', 'profissional')
    search_fields = ('profissional__nome',) # Busca pelo nome do médico