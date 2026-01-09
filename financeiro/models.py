from django.db import models
# Importe o model de Agendamento. Se der erro de ciclo, use string 'agendamento.Agendamento'
from agendamento.models import Agendamento 

class Fatura(models.Model):
    PAGAMENTO_CHOICES = [
        ('dinheiro', 'Dinheiro'),
        ('cartao_credito', 'Cartão de Crédito'),
        ('cartao_debito', 'Cartão de Débito'),
        ('pix', 'Pix'),
        ('convenio', 'Convênio'),
        ('pendente', 'A definir'),
    ]

    agendamento = models.OneToOneField(Agendamento, on_delete=models.CASCADE, related_name='fatura')
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    forma_pagamento = models.CharField(max_length=20, choices=PAGAMENTO_CHOICES, default='pendente')
    pago = models.BooleanField(default=False)
    
    criado_em = models.DateTimeField(auto_now_add=True)