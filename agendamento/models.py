from django.db import models
from django.db.models import Q
from profissionais.models import Profissional, Especialidade
from pacientes.models import Paciente 
from configuracoes.models import Convenio 

class BloqueioAgenda(models.Model):
    TIPO_CHOICES = [
        ('feriado', 'Feriado'),
        ('bloqueio', 'Bloqueio Manual (Férias/Reunião)'),
    ]
    profissional = models.ForeignKey(Profissional, on_delete=models.CASCADE, null=True, blank=True)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    hora_inicio = models.TimeField(default='00:00')
    hora_fim = models.TimeField(default='23:59')
    motivo = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='bloqueio')
    recorrente = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.motivo}"

class Agendamento(models.Model):
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
    enviar_whatsapp = models.BooleanField(default=True, verbose_name="Enviar Confirmação?")
    data = models.DateField()
    horario = models.TimeField()
    is_encaixe = models.BooleanField(default=False)
    
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    observacoes = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AGENDADO)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['data', 'horario']
        constraints = [
            models.UniqueConstraint(
                fields=['profissional', 'data', 'horario', 'paciente'], 
                condition=Q(status__in=['agendado', 'aguardando', 'em_atendimento']),
                name='unique_paciente_horario'
            )
        ]

    def __str__(self):
        return f"{self.paciente} - {self.data} {self.horario}"