from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.db import models
from agendamento.models import Agendamento
from pacientes.models import Paciente
from profissionais.models import Profissional
from configuracoes.models import Cid


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


def classificar_pressao(sistolica, diastolica):
    if sistolica is None or diastolica is None:
        return None
    if sistolica >= 180 or diastolica >= 120:
        return 'Crise Hipertensiva'
    if sistolica >= 140 or diastolica >= 90:
        return 'Hipertensao Grau 2'
    if sistolica >= 130 or diastolica >= 80:
        return 'Hipertensao Grau 1'
    if 120 <= sistolica <= 129 and diastolica < 80:
        return 'Pressao Elevada'
    return 'Pressao Normal'


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
    alergias = models.TextField(blank=True)
    medicacoes_em_uso = models.TextField(blank=True)
    historico_relevante = models.TextField(blank=True)
    historico_flags = models.JSONField(blank=True, null=True, default=dict)

    peso_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    altura_cm = models.PositiveIntegerField(null=True, blank=True)
    pressao_sistolica = models.PositiveIntegerField(null=True, blank=True)
    pressao_diastolica = models.PositiveIntegerField(null=True, blank=True)
    temperatura_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    frequencia_cardiaca = models.PositiveIntegerField(null=True, blank=True)
    frequencia_respiratoria = models.PositiveIntegerField(null=True, blank=True)
    saturacao = models.PositiveIntegerField(null=True, blank=True)
    glicemia_capilar = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)

    imc = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    classificacao_imc = models.CharField(max_length=40, blank=True)
    obesidade_grau = models.CharField(max_length=40, blank=True)
    pressao_classificacao = models.CharField(max_length=40, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def recalcular_indices(self):
        imc = calcular_imc(self.peso_kg, self.altura_cm)
        self.imc = imc
        self.classificacao_imc = classificar_imc(imc) or ''
        self.obesidade_grau = classificar_obesidade(imc) or ''
        self.pressao_classificacao = classificar_pressao(
            self.pressao_sistolica,
            self.pressao_diastolica
        ) or ''

    def save(self, *args, **kwargs):
        self.recalcular_indices()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Triagem {self.agendamento_id}"


class AtendimentoMedico(models.Model):
    agendamento = models.OneToOneField(
        Agendamento,
        on_delete=models.CASCADE,
        related_name='atendimento_medico'
    )
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='atendimentos_medicos'
    )
    profissional = models.ForeignKey(
        Profissional,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='atendimentos_medicos'
    )

    queixa_principal = models.TextField(blank=True)
    historia_doenca_atual = models.TextField(blank=True)
    antecedentes_pessoais = models.TextField(blank=True)
    antecedentes_familiares = models.TextField(blank=True)
    alergias_referidas = models.TextField(blank=True)
    medicacoes_em_uso = models.TextField(blank=True)
    habitos_vida = models.TextField(blank=True)

    exame_fisico = models.TextField(blank=True)
    plano_terapeutico = models.TextField(blank=True)
    orientacoes = models.TextField(blank=True)
    encaminhamento = models.TextField(blank=True)
    observacoes_gerais = models.TextField(blank=True)
    atestado = models.TextField(blank=True)

    prescricao_medicamentos = models.JSONField(blank=True, null=True, default=list)
    exames_solicitados = models.JSONField(blank=True, null=True, default=list)

    cid_principal = models.ForeignKey(
        Cid,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='atendimentos_principais'
    )
    cid_secundario = models.ForeignKey(
        Cid,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='atendimentos_secundarios'
    )
    diagnostico_descricao = models.TextField(blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Atendimento {self.agendamento_id}"
