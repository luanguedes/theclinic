from django.contrib import admin
from .models import Convenio, Medicamento, Exame, Cid

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


@admin.register(Exame)
class ExameAdmin(admin.ModelAdmin):
    list_display = ('codigo_tuss', 'nome', 'tipo', 'situacao')
    search_fields = ('codigo_tuss', 'nome', 'tipo', 'search_text')
    list_filter = ('situacao', 'tipo')


@admin.register(Cid)
class CidAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nome', 'situacao')
    search_fields = ('codigo', 'nome', 'search_text')
    list_filter = ('situacao',)
