from rest_framework import serializers
from .models import Triagem


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
            'realizado_por',
            'criado_em',
            'atualizado_em',
        ]
