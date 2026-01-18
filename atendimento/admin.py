from django.contrib import admin
from .models import Triagem


@admin.register(Triagem)
class TriagemAdmin(admin.ModelAdmin):
    list_display = ('id', 'agendamento', 'realizado_por', 'criado_em')
    search_fields = ('agendamento__paciente__nome', 'agendamento__paciente__cpf')
