from rest_framework import serializers
from .models import Operador

class OperadorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    profissional_nome = serializers.CharField(source='profissional.nome', read_only=True)

    class Meta:
        model = Operador
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'password',
            'is_superuser', 'profissional', 'profissional_nome',
            'acesso_agendamento', 'acesso_atendimento', 
            'acesso_faturamento', 'acesso_cadastros', 'acesso_configuracoes',
            'force_password_change' 
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = Operador(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance