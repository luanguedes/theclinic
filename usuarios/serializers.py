from rest_framework import serializers
from .models import Operador

class OperadorSerializer(serializers.ModelSerializer):
    # Senha é write_only (só aceita na escrita, não retorna na leitura por segurança)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Operador
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'password',
            'is_superuser', 
            'acesso_agendamento', 
            'acesso_atendimento', 
            'acesso_faturamento', 
            'acesso_cadastros',      # Novo campo
            'acesso_configuracoes'   # Novo campo
        ]

    def create(self, validated_data):
        # Precisamos interceptar a criação para criptografar a senha
        password = validated_data.pop('password', None)
        user = Operador(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        # Precisamos interceptar a atualização para criptografar a senha (se houver)
        password = validated_data.pop('password', None)
        
        # Atualiza os outros campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance