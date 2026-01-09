from rest_framework import serializers
from .models import Paciente

class PacienteSerializer(serializers.ModelSerializer):
    # --- A CORREÇÃO ESTÁ AQUI ---
    # Forçamos o tipo DateField para ele não tentar calcular fuso horário
    data_nascimento = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d", "%d/%m/%Y"])

    class Meta:
        model = Paciente
        fields = '__all__'