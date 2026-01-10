from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilOperador, ConfiguracaoSistema
from profissionais.models import Profissional

# --- SERIALIZER DE CRIAÇÃO E EDIÇÃO ---
class OperadorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    # Campos virtuais (não existem no User, mas sim no Perfil)
    acesso_atendimento = serializers.BooleanField(default=False)
    acesso_agendamento = serializers.BooleanField(default=False)
    acesso_faturamento = serializers.BooleanField(default=False)
    force_password_change = serializers.BooleanField(default=True)
    
    # Campo de vínculo profissional
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
                  'force_password_change', 'profissional_id']

    def to_representation(self, instance):
        """ Injeta os dados do Perfil de forma segura na leitura """
        representation = super().to_representation(instance)
        
        # Tenta acessar o perfil de forma segura
        try:
            perfil = instance.perfil
            representation['acesso_atendimento'] = perfil.acesso_atendimento
            representation['acesso_agendamento'] = perfil.acesso_agendamento
            representation['acesso_faturamento'] = perfil.acesso_faturamento
            representation['force_password_change'] = perfil.force_password_change
            
            if perfil.profissional_vinculado:
                representation['profissional_id'] = perfil.profissional_vinculado.id
            else:
                representation['profissional_id'] = None
        except Exception:
            # Se não tiver perfil, define padrões
            representation['acesso_atendimento'] = False
            representation['acesso_agendamento'] = False
            representation['acesso_faturamento'] = False
            representation['force_password_change'] = False
            representation['profissional_id'] = None
            
        return representation

    def create(self, validated_data):
        # Remove campos que não são do User
        atendimento = validated_data.pop('acesso_atendimento', False)
        agendamento = validated_data.pop('acesso_agendamento', False)
        faturamento = validated_data.pop('acesso_faturamento', False)
        force_change = validated_data.pop('force_password_change', True)

        # O DRF pode aninhar o source 'perfil.profissional_vinculado'
        perfil_data = validated_data.pop('perfil', {})
        profissional = perfil_data.get('profissional_vinculado', None)

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
            profissional_vinculado=profissional
        )

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        atendimento = validated_data.pop('acesso_atendimento', None)
        agendamento = validated_data.pop('acesso_agendamento', None)
        faturamento = validated_data.pop('acesso_faturamento', None)
        force_change = validated_data.pop('force_password_change', None)
        
        perfil_data = validated_data.pop('perfil', {})
        profissional = perfil_data.get('profissional_vinculado', None)
        update_profissional = 'profissional_vinculado' in perfil_data

        instance = super().update(instance, validated_data)

        if password:
            instance.set_password(password)
            instance.save()

        # Garante que o perfil existe ou cria um se não existir (para usuários antigos)
        perfil, created = PerfilOperador.objects.get_or_create(user=instance)

        if atendimento is not None: perfil.acesso_atendimento = atendimento
        if agendamento is not None: perfil.acesso_agendamento = agendamento
        if faturamento is not None: perfil.acesso_faturamento = faturamento
        if force_change is not None: perfil.force_password_change = force_change
        
        if update_profissional:
            perfil.profissional_vinculado = profissional

        perfil.save()

        return instance

# --- SERIALIZER DE LISTAGEM (CORRIGIDO E BLINDADO) ---
class OperadorListSerializer(serializers.ModelSerializer):
    # Usamos SerializerMethodField para não quebrar se o usuário não tiver perfil
    acesso_atendimento = serializers.SerializerMethodField()
    acesso_agendamento = serializers.SerializerMethodField()
    acesso_faturamento = serializers.SerializerMethodField()
    is_medico = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email', 'is_superuser', 
                  'acesso_atendimento', 'acesso_agendamento', 'acesso_faturamento', 'acesso_cadastros', 'is_medico']

    def get_perfil(self, obj):
        # Helper para evitar try/except repetitivo
        try:
            return obj.perfil
        except:
            return None

    def get_acesso_atendimento(self, obj):
        p = self.get_perfil(obj)
        return p.acesso_atendimento if p else False

    def get_acesso_agendamento(self, obj):
        p = self.get_perfil(obj)
        return p.acesso_agendamento if p else False

    def get_acesso_faturamento(self, obj):
        p = self.get_perfil(obj)
        return p.acesso_faturamento if p else False

    def get_is_medico(self, obj):
        p = self.get_perfil(obj)
        # Retorna True se tiver um profissional vinculado
        return bool(p and p.profissional_vinculado)

# --- SERIALIZER DE CONFIGURAÇÃO ---
class ConfiguracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = ['itens_por_pagina']