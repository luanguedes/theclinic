from rest_framework import serializers
from .models import Especialidade, Profissional, ProfissionalEspecialidade

class EspecialidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidade
        fields = ['id', 'nome']

class ProfissionalEspecialidadeSerializer(serializers.ModelSerializer):
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    
    # CAMPO DE ESCRITA (Mantém como está)
    especialidade_id = serializers.PrimaryKeyRelatedField(
        queryset=Especialidade.objects.all(), source='especialidade', write_only=True
    )

    # --- NOVO CAMPO PARA CORRIGIR O ERRO ---
    # Esse campo garante que o ID da especialidade seja enviado para o frontend na leitura
    especialidade_leitura = serializers.PrimaryKeyRelatedField(source='especialidade', read_only=True)

    class Meta:
        model = ProfissionalEspecialidade
        # Adicione 'especialidade_leitura' na lista de fields
        fields = [
            'id', 
            'especialidade_id', 
            'especialidade_leitura', 
            'nome_especialidade', 
            'sigla_conselho', 
            'registro_conselho', 
            'uf_conselho'
        ]

class ProfissionalSerializer(serializers.ModelSerializer):
    # ... (o resto do arquivo continua igual)
    especialidades = ProfissionalEspecialidadeSerializer(source='especialidades_vinculo', many=True)

    class Meta:
        model = Profissional
        fields = ['id', 'nome', 'cpf', 'data_nascimento', 'especialidades']

    # ... (métodos create e update continuam iguais)
    def create(self, validated_data):
        especialidades_data = validated_data.pop('especialidades_vinculo')
        profissional = Profissional.objects.create(**validated_data)
        for spec in especialidades_data:
            ProfissionalEspecialidade.objects.create(profissional=profissional, **spec)
        return profissional

    def update(self, instance, validated_data):
        especialidades_data = validated_data.pop('especialidades_vinculo', None)
        instance.nome = validated_data.get('nome', instance.nome)
        instance.cpf = validated_data.get('cpf', instance.cpf)
        instance.data_nascimento = validated_data.get('data_nascimento', instance.data_nascimento)
        instance.save()
        if especialidades_data is not None:
            instance.especialidades_vinculo.all().delete()
            for spec in especialidades_data:
                ProfissionalEspecialidade.objects.create(profissional=instance, **spec)
        return instance