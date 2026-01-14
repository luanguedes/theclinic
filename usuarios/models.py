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

    # Vinculo medico
    profissional = models.ForeignKey(
        'profissionais.Profissional',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='operador_vinculado',
        verbose_name="Profissional Vinculado"
    )

    # Permissoes
    acesso_agendamento = models.BooleanField(default=False, verbose_name="Acesso a Recepcao/Agenda")
    acesso_atendimento = models.BooleanField(default=False, verbose_name="Acesso Medico/Prontuario")
    acesso_faturamento = models.BooleanField(default=False, verbose_name="Acesso Financeiro")
    acesso_cadastros = models.BooleanField(default=False, verbose_name="Acesso a Cadastros Gerais")
    acesso_configuracoes = models.BooleanField(default=False, verbose_name="Acesso a Configuracoes do Sistema")
    acesso_whatsapp = models.BooleanField(default=False, verbose_name="Acesso WhatsApp")

    privilegios = models.ManyToManyField(
        Privilegio, blank=True, related_name='operadores'
    )

    # Forcar troca de senha
    force_password_change = models.BooleanField(
        default=True,
        verbose_name="Forcar Troca de Senha no Proximo Login"
    )

    theme_preference = models.CharField(
        max_length=10,
        choices=[('light', 'Claro'), ('dark', 'Escuro')],
        default='light',
        verbose_name="Tema Padrao"
    )

    def __str__(self):
        return self.first_name or self.username
