from django.contrib import admin
from .models import Convenio, Medicamento

@admin.register(Convenio)
class ConvenioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'ativo')
    search_fields = ('nome',)
    list_filter = ('ativo',)


@admin.register(Medicamento)
class MedicamentoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'principio_ativo', 'laboratorio', 'tarja', 'situacao')
    search_fields = ('nome', 'principio_ativo', 'laboratorio', 'tarja', 'nome_busca')
    list_filter = ('situacao', 'tarja')
