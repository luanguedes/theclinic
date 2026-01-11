from django.db import models

class Convenio(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    percentual_desconto = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.nome
    
    class Meta:
        ordering = ['nome']

class DadosClinica(models.Model):
    nome_fantasia = models.CharField(max_length=255)
    razao_social = models.CharField(max_length=255, blank=True, null=True)
    cnpj = models.CharField(max_length=18, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    
    # Campo de Imagem (Requer: pip install Pillow)
    logo = models.ImageField(upload_to='clinica_logos/', blank=True, null=True)
    
    # Endereço
    logradouro = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    complemento = models.CharField(max_length=100, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)
    cep = models.CharField(max_length=10, blank=True, null=True)

    def save(self, *args, **kwargs):
        self.pk = 1 # Trava o ID em 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1, defaults={'nome_fantasia': 'Minha Clínica'})
        return obj

class ConfiguracaoSistema(models.Model):
    # 1. Interface
    itens_por_pagina = models.IntegerField(default=10, help_text="Paginação padrão das tabelas")
    modo_manutencao = models.BooleanField(default=False, help_text="Bloqueia acesso de não-admins")

    # 2. Segurança
    max_tentativas_login = models.IntegerField(default=5, help_text="Bloqueia após X tentativas")
    tempo_bloqueio_minutos = models.IntegerField(default=15, help_text="Tempo de bloqueio após errar senha")
    tempo_sessao_minutos = models.IntegerField(default=60, help_text="Deslogar após inatividade")

    # 3. Regras de Negócio
    enviar_whatsapp_global = models.BooleanField(
        default=True, 
        help_text="Se desmarcado, NENHUMA  mensagem será enviado pelo sistema."
    )
    janela_agendamento_meses = models.IntegerField(default=6, help_text="Meses à frente liberados na agenda")

    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"

    # --- SUGESTÃO: Adicionei o save aqui também para padronizar ---
    def save(self, *args, **kwargs):
        self.pk = 1 
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj