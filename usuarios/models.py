from django.contrib.auth.models import AbstractUser
from django.db import models


class Privilegio(models.Model):
    path = models.CharField(max_length=200, unique=True)
    label = models.CharField(max_length=100)
    module_key = models.CharField(max_length=50)
    module_label = models.CharField(max_length=100)
    module_order = models.IntegerField(default=0)
    item_order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.module_label}: {self.label}"

class Operador(AbstractUser):
    telefone = models.CharField(max_length=20, blank=True, null=True)
    
    # Vínculo Médico
    profissional = models.ForeignKey(
        'profissionais.Profissional', 
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='operador_vinculado',
        verbose_name="Profissional Vinculado"
    )

    # Permissões
    acesso_agendamento = models.BooleanField(default=False, verbose_name="Acesso à Recepção/Agenda")
    acesso_atendimento = models.BooleanField(default=False, verbose_name="Acesso Médico/Prontuário")
    acesso_faturamento = models.BooleanField(default=False, verbose_name="Acesso Financeiro")
    acesso_cadastros = models.BooleanField(default=False, verbose_name="Acesso a Cadastros Gerais")
    acesso_configuracoes = models.BooleanField(default=False, verbose_name="Acesso a Configurações do Sistema")

    privilegios = models.ManyToManyField(
        Privilegio, blank=True, related_name='operadores'
    )
    
    # --- NOVO CAMPO: FORÇAR TROCA DE SENHA ---
    force_password_change = models.BooleanField(
        default=True, 
        verbose_name="Forçar Troca de Senha no Próximo Login"
    )

    def __str__(self):
        return self.first_name or self.username
