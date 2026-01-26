from django.db import models

class Paciente(models.Model):
    SEXO_CHOICES = [
        ('Feminino', 'Feminino'),
        ('Masculino', 'Masculino'),
        ('Outro', 'Outro'),
    ]

    # --- DICIONÁRIO DE PRIORIDADES PARA O BACKEND ---
    PRIORIDADE_CHOICES = [
        (None, 'Nenhuma'),
        ('idoso', 'Idoso (60+)'),
        ('gestante', 'Gestante / Lactante'),
        ('cadeirante', 'Cadeirante / Mobilidade Reduzida'),
        ('autista', 'Transtorno do Espectro Autista'),
        ('pcd', 'PCD / Deficiência Oculta'),
    ]

    nome = models.CharField(max_length=255)
    nome_mae = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nome da Mãe")
    sexo = models.CharField(max_length=20, choices=SEXO_CHOICES, blank=True, null=True)
    
    # NOVO CAMPO: PRIORIDADE
    prioridade = models.CharField(
        max_length=20, 
        choices=PRIORIDADE_CHOICES, 
        blank=True, 
        null=True,
        default=None,
        verbose_name="Condição de Prioridade"
    )
    
    cpf = models.CharField(max_length=14, unique=True)
    rg = models.CharField(max_length=20, blank=True, null=True)
    cns = models.CharField(max_length=20, blank=True, null=True)
    data_nascimento = models.DateField()
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    nome_social = models.CharField(max_length=255, blank=True, null=True)
    estado_civil = models.CharField(max_length=40, blank=True, null=True)
    naturalidade = models.CharField(max_length=100, blank=True, null=True)
    uf_nascimento = models.CharField(max_length=2, blank=True, null=True)
    responsavel_nome = models.CharField(max_length=255, blank=True, null=True)
    responsavel_telefone = models.CharField(max_length=20, blank=True, null=True)
    contato_emergencia_nome = models.CharField(max_length=255, blank=True, null=True)
    contato_emergencia_telefone = models.CharField(max_length=20, blank=True, null=True)
    
    # Endereço
    cep = models.CharField(max_length=20, blank=True, null=True)
    logradouro = models.CharField(max_length=255, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    aceite_lgpd = models.BooleanField(default=False)

    historico_medico = models.TextField(blank=True)
    
    criado_em = models.DateTimeField(auto_now_add=True)
    
    # Mantendo sua correção de DateField
    atualizado_em = models.DateField(auto_now=True) 

    def __str__(self):
        return f"{self.nome} ({self.cpf})"
