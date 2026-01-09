from rest_framework import serializers
from .models import Paciente

class PacienteSerializer(serializers.ModelSerializer):
    # Formato de entrada da data de nascimento
    data_nascimento = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d", "%d/%m/%Y"])

    class Meta:
        model = Paciente
        fields = '__all__'
        # Definimos esses campos como somente leitura aqui para segurança
        read_only_fields = ['criado_em', 'atualizado_em']