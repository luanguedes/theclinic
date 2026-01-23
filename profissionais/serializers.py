from rest_framework import serializers

from .models import (
    Profissional,
    Especialidade,
    ProfissionalEspecialidade
)


class EspecialidadeSerializer(serializers.ModelSerializer):
    search_text = serializers.CharField(read_only=True)

    class Meta:
        model = Especialidade
        fields = ['id', 'codigo', 'codigo_visual', 'nome', 'status', 'search_text']

    def _compose_search_text(self, codigo, codigo_visual, nome):
        partes = [p for p in [codigo_visual, codigo, nome] if p]
        return " ".join(partes).strip()

    def _build_search_text(self, attrs):
        codigo = attrs.get('codigo') if 'codigo' in attrs else getattr(self.instance, 'codigo', '')
        codigo_visual = attrs.get('codigo_visual') if 'codigo_visual' in attrs else getattr(self.instance, 'codigo_visual', '')
        nome = attrs.get('nome') if 'nome' in attrs else getattr(self.instance, 'nome', '')
        return self._compose_search_text(codigo or '', codigo_visual or '', nome or '')

    def create(self, validated_data):
        validated_data['search_text'] = self._build_search_text(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if any(k in validated_data for k in ['codigo', 'codigo_visual', 'nome']):
            validated_data['search_text'] = self._build_search_text(validated_data)
        return super().update(instance, validated_data)


class ProfissionalEspecialidadeSerializer(serializers.ModelSerializer):
    nome_especialidade = serializers.CharField(
        source='especialidade.nome',
        read_only=True
    )
    codigo_especialidade = serializers.CharField(
        source='especialidade.codigo',
        read_only=True
    )
    codigo_visual_especialidade = serializers.CharField(
        source='especialidade.codigo_visual',
        read_only=True
    )

    especialidade_id = serializers.PrimaryKeyRelatedField(
        queryset=Especialidade.objects.all(),
        source='especialidade',
        write_only=True
    )

    especialidade_leitura = serializers.PrimaryKeyRelatedField(
        source='especialidade',
        read_only=True
    )

    class Meta:
        model = ProfissionalEspecialidade
        fields = [
            'id',  # ID do vinculo, NAO da especialidade
            'especialidade_id',
            'especialidade_leitura',
            'nome_especialidade',
            'codigo_especialidade',
            'codigo_visual_especialidade',
            'sigla_conselho',
            'registro_conselho',
            'uf_conselho'
        ]


class ProfissionalSerializer(serializers.ModelSerializer):
    # Estrutura completa para telas administrativas
    especialidades = ProfissionalEspecialidadeSerializer(
        source='especialidades_vinculo',
        many=True,
        read_only=True
    )

    # Estrutura simplificada para a recepcao (dropdown)
    especialidades_lista = serializers.SerializerMethodField()

    class Meta:
        model = Profissional
        fields = [
            'id',
            'nome',
            'cpf',
            'data_nascimento',
            'especialidades',
            'especialidades_lista'
        ]

    def get_especialidades_lista(self, obj):
        """
        Retorna lista limpa de especialidades vinculadas ao profissional:
        [{id, nome}]
        """
        return [
            {
                "id": vinculo.especialidade.id,
                "nome": vinculo.especialidade.nome,
                "codigo": vinculo.especialidade.codigo,
                "codigo_visual": vinculo.especialidade.codigo_visual
            }
            for vinculo in obj.especialidades_vinculo.all()
            if vinculo.especialidade and vinculo.especialidade.status
        ]

    def create(self, validated_data):
        especialidades_data = self.context['request'].data.get(
            'especialidades',
            []
        )

        profissional = Profissional.objects.create(**validated_data)

        for spec in especialidades_data:
            especialidade_id = spec.get('especialidade_id')
            if especialidade_id:
                ProfissionalEspecialidade.objects.create(
                    profissional=profissional,
                    especialidade_id=especialidade_id,
                    sigla_conselho=spec.get('sigla_conselho'),
                    registro_conselho=spec.get('registro_conselho'),
                    uf_conselho=spec.get('uf_conselho')
                )

        return profissional

    def update(self, instance, validated_data):
        instance.nome = validated_data.get('nome', instance.nome)
        instance.cpf = validated_data.get('cpf', instance.cpf)
        instance.data_nascimento = validated_data.get(
            'data_nascimento',
            instance.data_nascimento
        )
        instance.save()

        especialidades_data = self.context['request'].data.get('especialidades')

        if especialidades_data is not None:
            instance.especialidades_vinculo.all().delete()

            for spec in especialidades_data:
                especialidade_id = spec.get('especialidade_id')
                if especialidade_id:
                    ProfissionalEspecialidade.objects.create(
                        profissional=instance,
                        especialidade_id=especialidade_id,
                        sigla_conselho=spec.get('sigla_conselho'),
                        registro_conselho=spec.get('registro_conselho'),
                        uf_conselho=spec.get('uf_conselho')
                    )

        return instance
