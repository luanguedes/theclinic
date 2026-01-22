from rest_framework import serializers
from .models import Convenio, DadosClinica, ConfiguracaoSistema, Medicamento, Exame, Cid

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


class ExameSerializer(serializers.ModelSerializer):
    search_text = serializers.CharField(read_only=True)

    class Meta:
        model = Exame
        fields = '__all__'

    def _compose_search_text(self, nome, codigo):
        if nome and codigo:
            return f"{nome} ({codigo})"
        return nome or codigo or ""

    def _build_search_text(self, attrs):
        nome = attrs.get('nome') if 'nome' in attrs else getattr(self.instance, 'nome', '')
        codigo = attrs.get('codigo_tuss') if 'codigo_tuss' in attrs else getattr(self.instance, 'codigo_tuss', '')
        return self._compose_search_text(nome or '', codigo or '')

    def create(self, validated_data):
        validated_data['search_text'] = self._build_search_text(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if any(k in validated_data for k in ['nome', 'codigo_tuss']):
            validated_data['search_text'] = self._build_search_text(validated_data)
        return super().update(instance, validated_data)


class CidSerializer(serializers.ModelSerializer):
    search_text = serializers.CharField(read_only=True)

    class Meta:
        model = Cid
        fields = '__all__'

    def _compose_search_text(self, codigo, nome, codigo_puro=None):
        partes = [p for p in [codigo, codigo_puro, nome] if p]
        return " ".join(partes).strip()

    def _build_search_text(self, attrs):
        codigo = attrs.get('codigo') if 'codigo' in attrs else getattr(self.instance, 'codigo', '')
        nome = attrs.get('nome') if 'nome' in attrs else getattr(self.instance, 'nome', '')
        codigo_puro = None
        if 'codigo_puro' in attrs:
            codigo_puro = attrs.get('codigo_puro')
        return self._compose_search_text(codigo or '', nome or '', codigo_puro or None)

    def create(self, validated_data):
        codigo_puro = validated_data.pop('codigo_puro', None)
        validated_data['search_text'] = self._compose_search_text(
            validated_data.get('codigo'),
            validated_data.get('nome'),
            codigo_puro
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if any(k in validated_data for k in ['codigo', 'nome']):
            codigo_puro = validated_data.pop('codigo_puro', None)
            validated_data['search_text'] = self._compose_search_text(
                validated_data.get('codigo', instance.codigo),
                validated_data.get('nome', instance.nome),
                codigo_puro
            )
        return super().update(instance, validated_data)
