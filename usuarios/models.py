from django.contrib.auth.models import AbstractUser
from django.db import models

class Operador(AbstractUser):
    telefone = models.CharField(max_length=20, blank=True, null=True)
    
    # --- CAMPO QUE FALTAVA ---
    # Cria o vínculo: Usuário <-> Médico
    profissional = models.ForeignKey(
        'profissionais.Profissional', # Aponta para o model Profissional
        on_delete=models.SET_NULL,    # Se apagar o médico, o usuário continua existindo
        null=True,                    # Pode ser vazio (recepcionista não é médico)
        blank=True,
        related_name='operador_vinculado',
        verbose_name="Profissional Vinculado"
    )

    # PERMISSÕES
    acesso_agendamento = models.BooleanField(default=False, verbose_name="Acesso Recepção/Agenda")
    acesso_atendimento = models.BooleanField(default=False, verbose_name="Acesso Atendimento/Prontuário")
    acesso_faturamento = models.BooleanField(default=False, verbose_name="Acesso Financeiro")
    
    # NOVAS PERMISSÕES
    acesso_cadastros = models.BooleanField(
        default=False, 
        verbose_name="Acesso a Cadastros Gerais"
    )
    
    acesso_configuracoes = models.BooleanField(
        default=False, 
        verbose_name="Acesso a Configurações do Sistema"
    )

    def __str__(self):
        return self.first_name or self.username