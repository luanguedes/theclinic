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
    logo = models.ImageField(upload_to='clinica_logos/', blank=True, null=True)
    
    # Endereço
    logradouro = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    complemento = models.CharField(max_length=100, blank=True, null=True) # <-- Novo campo
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)
    cep = models.CharField(max_length=10, blank=True, null=True)

    def save(self, *args, **kwargs):
        self.pk = 1 # Garante que só exista um registro
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1, defaults={'nome_fantasia': 'Minha Clínica'})
        return obj