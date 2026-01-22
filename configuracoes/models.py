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
    janela_agendamento_meses = models.IntegerField(default=6, help_text="Meses à frente liberados na agenda")

    # 1. Configurações dos Robôs
    enviar_whatsapp_global = models.BooleanField(
        default=True, 
        help_text="Se desmarcado, NENHUMA  mensagem será enviado pelo sistema."
    )
    enviar_wpp_confirmacao = models.BooleanField(default=True, verbose_name="Enviar Confirmação (Novo Agendamento)")
    enviar_wpp_bloqueio = models.BooleanField(default=True, verbose_name="Enviar Aviso de Bloqueio/Cancelamento")
    enviar_wpp_lembrete = models.BooleanField(default=True, verbose_name="Enviar Lembrete (Dia Anterior)")

    # 2. Configurações do Cron (Lembrete Automático)
    horario_disparo_lembrete = models.TimeField(default="08:00", help_text="Horário alvo para o envio automático")
    data_ultima_execucao_lembrete = models.DateField(null=True, blank=True, help_text="Data do último disparo automático realizado")
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


class Medicamento(models.Model):
    nome = models.CharField(max_length=255)
    principio_ativo = models.CharField(max_length=255)
    apresentacao = models.CharField(max_length=255, blank=True)
    laboratorio = models.CharField(max_length=255, blank=True)
    tarja = models.CharField(max_length=100, blank=True, null=True)
    nome_busca = models.TextField(blank=True)
    situacao = models.BooleanField(default=True)

    def __str__(self):
        return self.nome

    class Meta:
        ordering = ['nome']


class Exame(models.Model):
    TIPO_CHOICES = [
        ('Consulta', 'Consulta'),
        ('Exame', 'Exame'),
        ('Procedimento Clinico', 'Procedimento Clinico'),
        ('Cirurgia/Intervencao', 'Cirurgia/Intervencao'),
    ]

    codigo_tuss = models.CharField(max_length=20, unique=True, db_index=True)
    nome = models.CharField(max_length=500)
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES, default='Exame')
    search_text = models.CharField(max_length=600, db_index=True)
    situacao = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nome} ({self.codigo_tuss})"

    class Meta:
        ordering = ['nome']


class Cid(models.Model):
    codigo = models.CharField(max_length=10, unique=True, db_index=True)
    nome = models.CharField(max_length=500)
    search_text = models.CharField(max_length=600, db_index=True)
    situacao = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

    class Meta:
        ordering = ['codigo']
