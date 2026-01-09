from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilOperador, ConfiguracaoSistema
# --- IMPORTAÇÃO NECESSÁRIA PARA O VÍNCULO ---
from profissionais.models import Profissional 

# --- SERIALIZER DE CRIAÇÃO E EDIÇÃO ---
class OperadorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False) # required=False para permitir edição sem trocar a senha
    
    # Campos que vêm do Frontend
    acesso_atendimento = serializers.BooleanField(default=False)
    acesso_agendamento = serializers.BooleanField(default=False)
    acesso_faturamento = serializers.BooleanField(default=False)
    force_password_change = serializers.BooleanField(default=True)
    
    # --- NOVO CAMPO: VÍNCULO COM PROFISSIONAL ---
    # Aceita o ID do médico, busca no banco, e mapeia para perfil.profissional_vinculado
    profissional_id = serializers.PrimaryKeyRelatedField(
        queryset=Profissional.objects.all(), 
        source='perfil.profissional_vinculado', 
        required=False, 
        allow_null=True
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'email', 'is_superuser', 
                  'acesso_atendimento', 'acesso_agendamento', 'acesso_faturamento', 
                  'force_password_change', 'profissional_id'] # <--- Adicionado aqui

    # --- LÓGICA DE LEITURA (INJETA DADOS DO PERFIL) ---
    def to_representation(self, instance):
        """ Injeta os dados do Perfil quando o Frontend pede os dados do Operador """
        representation = super().to_representation(instance)
        
        if hasattr(instance, 'perfil'):
            representation['acesso_atendimento'] = instance.perfil.acesso_atendimento
            representation['acesso_agendamento'] = instance.perfil.acesso_agendamento
            representation['acesso_faturamento'] = instance.perfil.acesso_faturamento
            representation['force_password_change'] = instance.perfil.force_password_change
            
            # Retorna o ID do profissional se houver vínculo
            if instance.perfil.profissional_vinculado:
                representation['profissional_id'] = instance.perfil.profissional_vinculado.id
            else:
                representation['profissional_id'] = None
            
        return representation

    # --- LÓGICA DE CRIAÇÃO (CREATE) ---
    def create(self, validated_data):
        atendimento = validated_data.pop('acesso_atendimento', False)
        agendamento = validated_data.pop('acesso_agendamento', False)
        faturamento = validated_data.pop('acesso_faturamento', False)
        force_change = validated_data.pop('force_password_change', True)

        # Extrai o profissional (O DRF coloca dentro de um dict 'perfil' por causa do source)
        perfil_data = validated_data.pop('perfil', {})
        profissional = perfil_data.get('profissional_vinculado', None)

        # Cria usuário com criptografia
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
            force_password_change=force_change,
            profissional_vinculado=profissional # <--- Salva o vínculo
        )

        return user

    # --- LÓGICA DE ATUALIZAÇÃO (UPDATE) ---
    def update(self, instance, validated_data):
        # 1. Separa os campos que não pertencem ao Model User diretamente
        password = validated_data.pop('password', None)
        
        atendimento = validated_data.pop('acesso_atendimento', None)
        agendamento = validated_data.pop('acesso_agendamento', None)
        faturamento = validated_data.pop('acesso_faturamento', None)
        force_change = validated_data.pop('force_password_change', None)
        
        # Extrai dados do profissional (se foi enviado no request)
        perfil_data = validated_data.pop('perfil', {})
        profissional = perfil_data.get('profissional_vinculado', None)
        # Verifica se o campo foi enviado no JSON (para diferenciar de "não alterar")
        update_profissional = 'profissional_vinculado' in perfil_data

        # 2. Atualiza os campos padrão do User
        instance = super().update(instance, validated_data)

        # 3. Se enviou senha, criptografa corretamente
        if password:
            instance.set_password(password)
            instance.save()

        # 4. Atualiza o Perfil relacionado (permissões e vínculo)
        if hasattr(instance, 'perfil'):
            perfil = instance.perfil
            if atendimento is not None: perfil.acesso_atendimento = atendimento
            if agendamento is not None: perfil.acesso_agendamento = agendamento
            if faturamento is not None: perfil.acesso_faturamento = faturamento
            if force_change is not None: perfil.force_password_change = force_change
            
            # Atualiza o vínculo se o campo veio no payload
            if update_profissional:
                perfil.profissional_vinculado = profissional

            perfil.save()

        return instance

# --- SERIALIZER DE LISTAGEM (Leitura Segura) ---
class OperadorListSerializer(serializers.ModelSerializer):
    acesso_atendimento = serializers.BooleanField(source='perfil.acesso_atendimento', read_only=True)
    acesso_agendamento = serializers.BooleanField(source='perfil.acesso_agendamento', read_only=True)
    acesso_faturamento = serializers.BooleanField(source='perfil.acesso_faturamento', read_only=True)
    # Opcional: mostrar se é vinculado na lista
    is_medico = serializers.BooleanField(source='perfil.profissional_vinculado', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email', 'is_superuser', 
                  'acesso_atendimento', 'acesso_agendamento', 'acesso_faturamento', 'is_medico']

# --- SERIALIZER DE CONFIGURAÇÃO ---
class ConfiguracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = ['itens_por_pagina']