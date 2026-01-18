from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.db import models
from agendamento.models import Agendamento


def calcular_imc(peso_kg, altura_cm):
    if peso_kg is None or altura_cm is None:
        return None
    altura_m = Decimal(altura_cm) / Decimal('100')
    if altura_m <= 0:
        return None
    imc = Decimal(peso_kg) / (altura_m * altura_m)
    return imc.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def classificar_imc(imc):
    if imc is None:
        return None
    if imc < Decimal('18.5'):
        return 'Baixo Peso'
    if imc < Decimal('25.0'):
        return 'Peso Normal'
    if imc < Decimal('30.0'):
        return 'Sobrepeso'
    if imc < Decimal('35.0'):
        return 'Obesidade Grau I'
    if imc < Decimal('40.0'):
        return 'Obesidade Grau II'
    return 'Obesidade Grau III'


def classificar_obesidade(imc):
    if imc is None:
        return None
    if imc < Decimal('30.0'):
        return 'Sem Obesidade'
    if imc < Decimal('35.0'):
        return 'Obesidade Grau I'
    if imc < Decimal('40.0'):
        return 'Obesidade Grau II'
    return 'Obesidade Grau III'


class Triagem(models.Model):
    agendamento = models.OneToOneField(
        Agendamento,
        on_delete=models.CASCADE,
        related_name='triagem'
    )
    realizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    queixa_principal = models.CharField(max_length=255, blank=True)
    observacoes_gerais = models.TextField(blank=True)

    peso_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    altura_cm = models.PositiveIntegerField(null=True, blank=True)
    pressao_sistolica = models.PositiveIntegerField(null=True, blank=True)
    pressao_diastolica = models.PositiveIntegerField(null=True, blank=True)

    imc = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    classificacao_imc = models.CharField(max_length=40, blank=True)
    obesidade_grau = models.CharField(max_length=40, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def recalcular_indices(self):
        imc = calcular_imc(self.peso_kg, self.altura_cm)
        self.imc = imc
        self.classificacao_imc = classificar_imc(imc) or ''
        self.obesidade_grau = classificar_obesidade(imc) or ''

    def save(self, *args, **kwargs):
        self.recalcular_indices()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Triagem {self.agendamento_id}"
