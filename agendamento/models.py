from django.db import models
from profissionais.models import Profissional, Especialidade
from pacientes.models import Paciente 
from configuracoes.models import Convenio 

class Agendamento(models.Model):
    # Definimos a classe Status aqui
    class Status(models.TextChoices):
        AGENDADO = 'agendado', 'Agendado'
        AGUARDANDO = 'aguardando', 'Aguardando Atendimento'
        EM_ATENDIMENTO = 'em_atendimento', 'Em Atendimento'
        FINALIZADO = 'finalizado', 'Finalizado'
        CANCELADO = 'cancelado', 'Cancelado'
        FALTOU = 'faltou', 'Faltou'

    profissional = models.ForeignKey(Profissional, on_delete=models.CASCADE)
    especialidade = models.ForeignKey(Especialidade, on_delete=models.CASCADE)
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    
    convenio = models.ForeignKey(Convenio, on_delete=models.SET_NULL, null=True, blank=True)
    
    data = models.DateField()
    horario = models.TimeField()
    is_encaixe = models.BooleanField(default=False)
    
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    observacoes = models.TextField(blank=True, null=True)
    
    # --- A CORREÇÃO É AQUI ---
    # Usamos Status.choices e Status.AGENDADO
    status = models.CharField(
        max_length=20, 
        choices=Status.choices,  # <--- Mudou aqui
        default=Status.AGENDADO  # <--- Mudou aqui
    )
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True) # Importante adicionar este campo que eu mencionei antes

    class Meta:
        ordering = ['data', 'horario']

    def __str__(self):
        return f"{self.paciente} - {self.data} {self.horario}"