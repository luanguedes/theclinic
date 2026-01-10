from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Operador
from .serializers import OperadorSerializer

# --- VIEWSET UNIFICADO (Substitui Novo, Detalhe e Listar) ---
class OperadorViewSet(viewsets.ModelViewSet):
    queryset = Operador.objects.all().order_by('first_name')
    serializer_class = OperadorSerializer
    permission_classes = [IsAuthenticated] # Você pode restringir mais se quiser
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'email']

    def update(self, request, *args, **kwargs):
        # Lógica para não obrigar senha na edição
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Se a senha vier vazia, remove do request para não salvar string vazia
        if 'password' in request.data and not request.data['password']:
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
                request.data.pop('password')
                request.data._mutable = False
            else:
                # Caso seja um dict normal
                new_data = request.data.copy()
                del new_data['password']
                request._full_data = new_data

        return super().update(request, *args, **kwargs)

# --- ME VIEW (Dados do usuário logado) ---
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Como estamos usando o modelo Operador customizado, 
        # os campos estão DIRETO no usuário, não precisa de .perfil
        data = {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "email": user.email,
            "is_superuser": user.is_superuser,
            
            # Permissões
            "acesso_agendamento": getattr(user, 'acesso_agendamento', False),
            "acesso_atendimento": getattr(user, 'acesso_atendimento', False),
            "acesso_faturamento": getattr(user, 'acesso_faturamento', False),
            "acesso_cadastros": getattr(user, 'acesso_cadastros', False),     # <--- NOVO
            "acesso_configuracoes": getattr(user, 'acesso_configuracoes', False),
        }
        return Response(data)

# --- TROCA DE SENHA (Mantido) ---
class TrocarSenhaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        nova_senha = request.data.get('nova_senha')
        if not nova_senha or len(nova_senha) < 6:
            return Response({'error': 'A senha deve ter no mínimo 6 caracteres.'}, status=400)

        user = request.user
        user.set_password(nova_senha)
        user.save()

        return Response({'message': 'Senha alterada com sucesso!'})