from django.db import models
from django.contrib.auth.models import User

class PerfilOperador(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    
    profissional_vinculado = models.ForeignKey(
        'profissionais.Profissional', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='usuario_sistema'
    )
    acesso_atendimento = models.BooleanField(default=False)
    acesso_agendamento = models.BooleanField(default=False)
    acesso_faturamento = models.BooleanField(default=False)
    force_password_change = models.BooleanField(default=True)

    acesso_cadastros = models.BooleanField(
        default=False, 
        verbose_name="Acesso a Cadastros Gerais"
    )

    def __str__(self):
        return f"Perfil de {self.user.username}"

class ConfiguracaoSistema(models.Model):
    itens_por_pagina = models.IntegerField(default=15)
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super(ConfiguracaoSistema, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj