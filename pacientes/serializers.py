from rest_framework import serializers
from .models import Paciente

class PacienteSerializer(serializers.ModelSerializer):
    # 1. Correção do Nascimento (já tinhamos feito)
    data_nascimento = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d", "%d/%m/%Y"])

    # 2. A CORREÇÃO DO ERRO 500:
    # Definimos atualizado_em como DateField porque o banco está retornando apenas data.
    # Isso impede que o Django tente calcular fuso horário (utcoffset).
    atualizado_em = serializers.DateField(read_only=True, format="%Y-%m-%d")

    # 3. Mantemos o criado_em como DateTime (pois o teste mostrou que ele está certo)
    criado_em = serializers.DateTimeField(read_only=True, format="%d/%m/%Y %H:%M:%S")

    class Meta:
        model = Paciente
        fields = '__all__'