from django.db import models

class Especialidade(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = "Especialidade"
        verbose_name_plural = "Especialidades"
        ordering = ['nome']

class Profissional(models.Model):
    nome = models.CharField(max_length=255)
    cpf = models.CharField(max_length=14, unique=True)
    data_nascimento = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = "Profissional"
        verbose_name_plural = "Profissionais"
        ordering = ['nome']

class ProfissionalEspecialidade(models.Model):
    """ Tabela intermediária para vincular Profissional <-> Especialidade com dados do Conselho """
    profissional = models.ForeignKey(Profissional, related_name='especialidades_vinculo', on_delete=models.CASCADE)
    especialidade = models.ForeignKey(Especialidade, on_delete=models.PROTECT)
    
    # --- NOVOS CAMPOS SOLICITADOS ---
    sigla_conselho = models.CharField(max_length=10)    # Ex: CRM, COREN, CRO, CRP
    registro_conselho = models.CharField(max_length=20) # Ex: 123456
    uf_conselho = models.CharField(max_length=2)        # Ex: SP
    
    class Meta:
        unique_together = ('profissional', 'especialidade')