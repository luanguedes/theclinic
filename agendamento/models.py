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

    profissional = models.ForeignKey(Profissional, on_delete=models.CASCADE, null=True, blank=True) # Null = Todos
    data_inicio = models.DateField()
    data_fim = models.DateField()
    hora_inicio = models.TimeField(default='00:00')
    hora_fim = models.TimeField(default='23:59')
    
    motivo = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='bloqueio')
    recorrente = models.BooleanField(default=False, help_text="Repete todo ano na mesma data (para feriados)")
    
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        quem = self.profissional.nome if self.profissional else "Todos"
        return f"{self.get_tipo_display()} - {quem} ({self.data_inicio})"

class Agendamento(models.Model):
    # ... (Seus campos anteriores continuam aqui: Status, profissional, etc) ...
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
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AGENDADO)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['data', 'horario']
        # --- TRAVA DE SEGURANÇA NO BANCO ---
        constraints = [
            models.UniqueConstraint(
                fields=['profissional', 'data', 'horario'], 
                condition=Q(is_encaixe=False, status__in=['agendado', 'aguardando', 'em_atendimento']),
                name='unique_agendamento_horario'
            )
        ]

    def __str__(self):
        return f"{self.paciente} - {self.data} {self.horario}"