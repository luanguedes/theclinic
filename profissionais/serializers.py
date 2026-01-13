from rest_framework import serializers
from .models import Especialidade, Profissional, ProfissionalEspecialidade

class EspecialidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidade
        fields = ['id', 'nome']

class ProfissionalEspecialidadeSerializer(serializers.ModelSerializer):
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    
    # Write Only: Para quando você salva no cadastro do médico
    especialidade_id = serializers.PrimaryKeyRelatedField(
        queryset=Especialidade.objects.all(), source='especialidade', write_only=True
    )

    # Read Only: Garante que o ID da especialidade real esteja disponível
    especialidade_leitura = serializers.PrimaryKeyRelatedField(source='especialidade', read_only=True)

    class Meta:
        model = ProfissionalEspecialidade
        fields = [
            'id', # CUIDADO: Este é o ID do Vínculo, não da especialidade
            'especialidade_id', 
            'especialidade_leitura', 
            'nome_especialidade', 
            'sigla_conselho', 
            'registro_conselho', 
            'uf_conselho'
        ]

class ProfissionalSerializer(serializers.ModelSerializer):
    # Mantém a estrutura completa para a tela de Cadastro de Profissionais
    especialidades = ProfissionalEspecialidadeSerializer(source='especialidades_vinculo', many=True, read_only=True)
    
    # --- NOVO CAMPO: ESPECIALIDADES SIMPLIFICADAS ---
    # Esse campo serve exclusivamente para facilitar o Dropdown da Recepção
    especialidades_lista = serializers.SerializerMethodField()

    class Meta:
        model = Profissional
        fields = ['id', 'nome', 'cpf', 'data_nascimento', 'especialidades', 'especialidades_lista']

    def get_especialidades_lista(self, obj):
        """
        Retorna uma lista limpa {id, nome} das especialidades.
        Evita confundir o ID do vínculo com o ID da especialidade.
        """
        return [
            {
                "id": vinculo.especialidade.id,
                "nome": vinculo.especialidade.nome
            }
            for vinculo in obj.especialidades_vinculo.all()
            if vinculo.especialidade # Garante que não pega nulos
        ]

    def create(self, validated_data):
        # Pega os dados brutos do request (que virão no formato esperado pelo serializer filho)
        especialidades_data = self.initial_data.get('especialidades_vinculo', [])
        
        # Cria o profissional
        profissional = Profissional.objects.create(**validated_data)
        
        # Cria os vínculos manualmente
        for spec in especialidades_data:
            # Aqui você precisa adaptar conforme o formato que seu front envia no cadastro
            # Se enviar via serializer aninhado, a lógica muda um pouco.
            # Assumindo que seu create já funcionava antes, mantemos a lógica padrão:
            pass 
            # Nota: O DRF padrão lida mal com writable nested serializers sem packages extras.
            # Se o seu create anterior funcionava, mantenha-o. 
            # Vou manter a lógica simples de criação abaixo se baseando no seu código original:
        
        return profissional

    # SOBREESCREVENDO CREATE/UPDATE PARA MANTER SUA LÓGICA ORIGINAL
    # (Reintegrando sua lógica manual que estava no código que você mandou)
    def create(self, validated_data):
        # O campo 'especialidades_vinculo' foi removido do validated_data pelo DRF porque é read_only ali em cima
        # Precisamos pegar do context ou initial_data se for salvar
        especialidades_data = self.context['request'].data.get('especialidades', [])
        
        profissional = Profissional.objects.create(**validated_data)
        
        for spec in especialidades_data:
            # Ajuste conforme os campos que vêm do front
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
        instance.data_nascimento = validated_data.get('data_nascimento', instance.data_nascimento)
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