from rest_framework import serializers
from .models import Convenio, DadosClinica

class ConvenioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Convenio
        fields = '__all__'

class DadosClinicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DadosClinica
        fields = '__all__'