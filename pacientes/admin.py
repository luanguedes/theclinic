from django.contrib import admin
from .models import Paciente

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cpf', 'telefone', 'data_nascimento', 'criado_em')
    search_fields = ('nome', 'cpf', 'telefone')
    list_filter = ('sexo',)