from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Operador, Privilegio

# --- ESSA ERA A CLASSE QUE FALTAVA ---
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Adiciona dados básicos do usuário ao token
        token['username'] = user.username
        token['first_name'] = user.first_name
        token['is_superuser'] = user.is_superuser
        
        # Adiciona as PERMISSÕES EXPLICITAS (Booleanos)
        # O getattr evita erro se o campo não existir por algum motivo
        token['acesso_agendamento'] = getattr(user, 'acesso_agendamento', False)
        token['acesso_atendimento'] = getattr(user, 'acesso_atendimento', False)
        token['acesso_faturamento'] = getattr(user, 'acesso_faturamento', False)
        token['acesso_cadastros'] = getattr(user, 'acesso_cadastros', False)
        token['acesso_configuracoes'] = getattr(user, 'acesso_configuracoes', False)

        # Adiciona ID do Profissional se estiver vinculado
        if user.profissional:
            token['profissional_id'] = user.profissional.id
            try:
                token['profissional_nome'] = user.profissional.nome
            except:
                token['profissional_nome'] = ""

        return token

# --- SEU SERIALIZER ORIGINAL (MANTIDO) ---
class OperadorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    profissional_nome = serializers.CharField(source='profissional.nome', read_only=True)
    privilegios = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Privilegio.objects.all(), required=False
    )
    privilegios_detalhes = serializers.SerializerMethodField()

    class Meta:
        model = Operador
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'password',
            'is_superuser', 'profissional', 'profissional_nome',
            'acesso_agendamento', 'acesso_atendimento', 
            'acesso_faturamento', 'acesso_cadastros', 'acesso_configuracoes',
            'force_password_change',
            'privilegios', 'privilegios_detalhes'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        privilegios = validated_data.pop('privilegios', [])
        user = Operador(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        if privilegios:
            user.privilegios.set(privilegios)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        privilegios = validated_data.pop('privilegios', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if privilegios is not None:
            instance.privilegios.set(privilegios)
        return instance

    def get_privilegios_detalhes(self, obj):
        return [
            {
                'id': p.id,
                'path': p.path,
                'label': p.label,
                'module_key': p.module_key,
                'module_label': p.module_label
            }
            for p in obj.privilegios.filter(active=True).order_by('module_order', 'item_order')
        ]


class PrivilegioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Privilegio
        fields = ['id', 'path', 'label', 'module_key', 'module_label', 'module_order', 'item_order', 'active']
