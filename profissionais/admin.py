from django.contrib import admin
from .models import Profissional, Especialidade, ProfissionalEspecialidade

# 1. Configura a "tabela filha" (Vínculo + CRM) para aparecer dentro do Médico
class ProfissionalEspecialidadeInline(admin.TabularInline):
    model = ProfissionalEspecialidade
    extra = 1  # Deixa uma linha em branco pronta para preencher
    autocomplete_fields = ['especialidade'] # Opcional: Ajuda se tiver muitas especialidades

@admin.register(Especialidade)
class EspecialidadeAdmin(admin.ModelAdmin):
    list_display = ('id', 'codigo', 'codigo_visual', 'nome', 'status')
    search_fields = ('codigo', 'codigo_visual', 'nome', 'search_text')
    list_filter = ('status',)

@admin.register(Profissional)
class ProfissionalAdmin(admin.ModelAdmin):
    # Campos que realmente existem no Profissional
    list_display = ('id', 'nome', 'cpf', 'created_at') 
    search_fields = ('nome', 'cpf')
    
    # Aqui a mágica acontece: colocamos o vínculo do conselho dentro da tela do médico
    inlines = [ProfissionalEspecialidadeInline] 

# Opcional: Se quiser ver a tabela de vínculos separada também
@admin.register(ProfissionalEspecialidade)
class ProfissionalEspecialidadeAdmin(admin.ModelAdmin):
    list_display = ('profissional', 'especialidade', 'sigla_conselho', 'registro_conselho', 'uf_conselho')
    list_filter = ('sigla_conselho', 'uf_conselho')
    search_fields = ('profissional__nome', 'registro_conselho')
