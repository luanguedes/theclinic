from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilOperador, ConfiguracaoSistema

# --- SERIALIZER DE CRIAÇÃO E EDIÇÃO ---
class OperadorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False) # required=False para permitir edição sem trocar a senha
    
    # Campos que vêm do Frontend (definimos como False padrão, mas o to_representation vai preencher na leitura)
    acesso_atendimento = serializers.BooleanField(default=False)
    acesso_agendamento = serializers.BooleanField(default=False)
    acesso_faturamento = serializers.BooleanField(default=False)
    force_password_change = serializers.BooleanField(default=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'email', 'is_superuser', 
                  'acesso_atendimento', 'acesso_agendamento', 'acesso_faturamento', 
                  'force_password_change']

    # --- LÓGICA DE LEITURA (INJETA DADOS DO PERFIL) ---
    def to_representation(self, instance):
        """ Injeta os dados do Perfil quando o Frontend pede os dados do Operador """
        representation = super().to_representation(instance)
        
        if hasattr(instance, 'perfil'):
            representation['acesso_atendimento'] = instance.perfil.acesso_atendimento
            representation['acesso_agendamento'] = instance.perfil.acesso_agendamento
            representation['acesso_faturamento'] = instance.perfil.acesso_faturamento
            representation['force_password_change'] = instance.perfil.force_password_change
            
        return representation

    # --- LÓGICA DE CRIAÇÃO (CREATE) ---
    def create(self, validated_data):
        atendimento = validated_data.pop('acesso_atendimento', False)
        agendamento = validated_data.pop('acesso_agendamento', False)
        faturamento = validated_data.pop('acesso_faturamento', False)
        force_change = validated_data.pop('force_password_change', True)

        # Cria usuário com criptografia (create_user faz o hash automaticamente)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', '')
        )

        if validated_data.get('is_superuser', False):
            user.is_superuser = True
            user.is_staff = True
            user.save()

        PerfilOperador.objects.create(
            user=user,
            acesso_atendimento=atendimento,
            acesso_agendamento=agendamento,
            acesso_faturamento=faturamento,
            force_password_change=force_change
        )

        return user

    # --- LÓGICA DE ATUALIZAÇÃO (UPDATE - A CORREÇÃO ESTÁ AQUI) ---
    def update(self, instance, validated_data):
        # 1. Separa os campos que não pertencem ao Model User diretamente
        password = validated_data.pop('password', None)
        
        atendimento = validated_data.pop('acesso_atendimento', None)
        agendamento = validated_data.pop('acesso_agendamento', None)
        faturamento = validated_data.pop('acesso_faturamento', None)
        force_change = validated_data.pop('force_password_change', None)

        # 2. Atualiza os campos padrão do User (email, first_name, username, etc.)
        instance = super().update(instance, validated_data)

        # 3. Se enviou senha, criptografa corretamente
        if password:
            instance.set_password(password)
            instance.save()

        # 4. Atualiza o Perfil relacionado (permissões)
        if hasattr(instance, 'perfil'):
            perfil = instance.perfil
            if atendimento is not None:
                perfil.acesso_atendimento = atendimento
            if agendamento is not None:
                perfil.acesso_agendamento = agendamento
            if faturamento is not None:
                perfil.acesso_faturamento = faturamento
            if force_change is not None:
                perfil.force_password_change = force_change
            perfil.save()

        return instance

# --- SERIALIZER DE LISTAGEM (Leitura Segura) ---
class OperadorListSerializer(serializers.ModelSerializer):
    acesso_atendimento = serializers.BooleanField(source='perfil.acesso_atendimento', read_only=True)
    acesso_agendamento = serializers.BooleanField(source='perfil.acesso_agendamento', read_only=True)
    acesso_faturamento = serializers.BooleanField(source='perfil.acesso_faturamento', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email', 'is_superuser', 
                  'acesso_atendimento', 'acesso_agendamento', 'acesso_faturamento']

# --- SERIALIZER DE CONFIGURAÇÃO ---
class ConfiguracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = ['itens_por_pagina']