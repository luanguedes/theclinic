from django.db import models

class Paciente(models.Model):
    SEXO_CHOICES = [
        ('Feminino', 'Feminino'),
        ('Masculino', 'Masculino'),
        ('Outro', 'Outro'),
    ]

    nome = models.CharField(max_length=255)
    # Novo Campo
    nome_mae = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nome da Mãe")
    # Novo Campo
    sexo = models.CharField(max_length=20, choices=SEXO_CHOICES, blank=True, null=True)
    
    cpf = models.CharField(max_length=14, unique=True)
    data_nascimento = models.DateField()
    telefone = models.CharField(max_length=20, blank=True)
    
    # Endereço
    cep = models.CharField(max_length=20, blank=True, null=True)
    logradouro = models.CharField(max_length=255, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    historico_medico = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nome} ({self.cpf})"