from django.db import models
from django.contrib.auth.models import User

class PerfilOperador(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    
    acesso_atendimento = models.BooleanField(default=False)
    acesso_agendamento = models.BooleanField(default=False)
    acesso_faturamento = models.BooleanField(default=False)
    force_password_change = models.BooleanField(default=True)

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