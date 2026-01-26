from rest_framework import serializers
from .models import Triagem, AtendimentoMedico


class TriagemSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='agendamento.paciente.nome', read_only=True)
    profissional_nome = serializers.CharField(source='agendamento.profissional.nome', read_only=True)

    class Meta:
        model = Triagem
        fields = '__all__'
        read_only_fields = [
            'imc',
            'classificacao_imc',
            'obesidade_grau',
            'pressao_classificacao',
            'realizado_por',
            'criado_em',
            'atualizado_em',
        ]


class AtendimentoMedicoSerializer(serializers.ModelSerializer):
    cid_principal_codigo = serializers.CharField(source='cid_principal.codigo', read_only=True)
    cid_principal_nome = serializers.CharField(source='cid_principal.nome', read_only=True)
    cid_secundario_codigo = serializers.CharField(source='cid_secundario.codigo', read_only=True)
    cid_secundario_nome = serializers.CharField(source='cid_secundario.nome', read_only=True)

    class Meta:
        model = AtendimentoMedico
        fields = '__all__'
        read_only_fields = [
            'criado_em',
            'atualizado_em',
        ]
