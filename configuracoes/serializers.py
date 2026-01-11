from rest_framework import serializers
from .models import Convenio, DadosClinica, ConfiguracaoSistema

class ConvenioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Convenio
        fields = '__all__'

class DadosClinicaSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = DadosClinica
        fields = '__all__'

class ConfiguracaoSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = '__all__'