from django.db import models
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
    
    # Valores monetários
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Bom ter
    
    forma_pagamento = models.CharField(max_length=20, choices=PAGAMENTO_CHOICES, default='pendente')
    pago = models.BooleanField(default=False)
    
    # --- CAMPOS QUE FALTAVAM E CAUSAVAM O ERRO ---
    data_vencimento = models.DateField(null=True, blank=True)
    data_pagamento = models.DateField(null=True, blank=True)
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Fatura #{self.id} - {self.agendamento}"