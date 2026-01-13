class ProfissionalSerializer(serializers.ModelSerializer):
    especialidades = ProfissionalEspecialidadeSerializer(
        source='especialidades_vinculo',
        many=True,
        read_only=True
    )

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
        return [
            {
                "id": vinculo.especialidade.id,
                "nome": vinculo.especialidade.nome
            }
            for vinculo in obj.especialidades_vinculo.all()
            if vinculo.especialidade
        ]

    def create(self, validated_data):
        especialidades_data = self.context['request'].data.get('especialidades', [])

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
