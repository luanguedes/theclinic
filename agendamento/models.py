from django.db import models
from profissionais.models import Profissional, Especialidade
from pacientes.models import Paciente 
# Importação do modelo de Convenio
from configuracoes.models import Convenio 

class Agendamento(models.Model):
    STATUS_CHOICES = [
        ('agendado', 'Agendado'),
        ('confirmado', 'Confirmado'),
        ('cancelado', 'Cancelado'),
        ('concluido', 'Concluído'),
    ]

    profissional = models.ForeignKey(Profissional, on_delete=models.CASCADE)
    especialidade = models.ForeignKey(Especialidade, on_delete=models.CASCADE)
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    
    # --- CAMPO NOVO ADICIONADO ---
    convenio = models.ForeignKey(Convenio, on_delete=models.SET_NULL, null=True, blank=True)
    
    data = models.DateField()
    horario = models.TimeField()
    is_encaixe = models.BooleanField(default=False)
    
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    observacoes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='agendado')
    
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['data', 'horario']

    def __str__(self):
        return f"{self.paciente} - {self.data} {self.horario}"  