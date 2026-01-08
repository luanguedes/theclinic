import uuid
from django.db import models
from profissionais.models import Profissional, Especialidade
from configuracoes.models import Convenio

class AgendaConfig(models.Model):
    DIAS_SEMANA = [
        (0, 'Domingo'), (1, 'Segunda'), (2, 'Terça'), (3, 'Quarta'),
        (4, 'Quinta'), (5, 'Sexta'), (6, 'Sábado')
    ]

    group_id = models.UUIDField(default=uuid.uuid4, editable=True) 

    profissional = models.ForeignKey(Profissional, on_delete=models.CASCADE)
    especialidade = models.ForeignKey(Especialidade, on_delete=models.CASCADE)
    convenio = models.ForeignKey(Convenio, on_delete=models.SET_NULL, null=True, blank=True)
    
    dia_semana = models.IntegerField(choices=DIAS_SEMANA)
    
    data_inicio = models.DateField()
    data_fim = models.DateField()
    
    # --- CAMPO RENOMEADO: SITUACAO (True=Ativa, False=Encerrada) ---
    situacao = models.BooleanField(default=True, verbose_name="Situação da Agenda")
    
    hora_inicio = models.TimeField()
    hora_fim = models.TimeField()
    intervalo_minutos = models.IntegerField()
    quantidade_atendimentos = models.IntegerField(default=1) 
    tipo = models.CharField(max_length=20, default='padrao')
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Valor da Consulta")

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.profissional} - {self.get_dia_semana_display()}"