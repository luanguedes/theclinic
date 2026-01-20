from rest_framework import serializers
from .models import Convenio, DadosClinica, ConfiguracaoSistema, Medicamento

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


class MedicamentoSerializer(serializers.ModelSerializer):
    nome_busca = serializers.CharField(read_only=True)

    class Meta:
        model = Medicamento
        fields = '__all__'

    def _compose_nome_busca(self, nome, apresentacao, principio_ativo):
        partes = [p for p in [nome, apresentacao] if p]
        base = " ".join(partes).strip()
        if principio_ativo:
            if base:
                return f"{base} ({principio_ativo})"
            return f"({principio_ativo})"
        return base

    def _build_nome_busca(self, attrs):
        nome = attrs.get('nome') if 'nome' in attrs else getattr(self.instance, 'nome', '')
        apresentacao = attrs.get('apresentacao') if 'apresentacao' in attrs else getattr(self.instance, 'apresentacao', '')
        principio_ativo = attrs.get('principio_ativo') if 'principio_ativo' in attrs else getattr(self.instance, 'principio_ativo', '')
        return self._compose_nome_busca(nome or '', apresentacao or '', principio_ativo or '')

    def create(self, validated_data):
        validated_data['nome_busca'] = self._build_nome_busca(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if any(k in validated_data for k in ['nome', 'apresentacao', 'principio_ativo']):
            validated_data['nome_busca'] = self._build_nome_busca(validated_data)
        return super().update(instance, validated_data)
