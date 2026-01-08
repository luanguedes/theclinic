from django.contrib import admin
from .models import Profissional, Especialidade

@admin.register(Especialidade)
class EspecialidadeAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome')
    search_fields = ('nome',)

@admin.register(Profissional)
class ProfissionalAdmin(admin.ModelAdmin):
    list_display = ('nome', 'crm', 'ativo') # Ajuste 'crm' ou 'registro' conforme seu model
    search_fields = ('nome', 'crm')
    
    # Isso cria aquela caixa dupla para selecionar várias especialidades
    # Se der erro dizendo que o campo não existe, verifique se no model chama 'especialidades' ou 'especialidade'
    filter_horizontal = ('especialidades',)