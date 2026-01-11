from rest_framework import viewsets, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Operador
from .serializers import OperadorSerializer

class OperadorViewSet(viewsets.ModelViewSet):
    queryset = Operador.objects.all().select_related('profissional').order_by('first_name')
    serializer_class = OperadorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'email']

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Remove senha se vier vazia
        if 'password' in request.data and not request.data['password']:
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
                request.data.pop('password')
                request.data._mutable = False
            else:
                new_data = request.data.copy()
                del new_data['password']
                request._full_data = new_data

        return super().update(request, *args, **kwargs)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Tenta pegar o ID do profissional com segurança
        prof_id = None
        try:
            if hasattr(user, 'profissional') and user.profissional:
                prof_id = user.profissional.id
        except Exception as e:
            # Se der erro no banco ou vínculo, segue como None para não travar o login
            print(f"Erro ao carregar profissional: {e}")
            prof_id = None

        data = {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "profissional_id": prof_id,
            
            # Use getattr para evitar erro se o campo não existir no objeto user em memória
            "force_password_change": getattr(user, 'force_password_change', False),

            "acesso_agendamento": getattr(user, 'acesso_agendamento', False),
            "acesso_atendimento": getattr(user, 'acesso_atendimento', False),
            "acesso_faturamento": getattr(user, 'acesso_faturamento', False),
            "acesso_cadastros": getattr(user, 'acesso_cadastros', False),
            "acesso_configuracoes": getattr(user, 'acesso_configuracoes', False),
        }
        return Response(data)

class TrocarSenhaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        nova_senha = request.data.get('nova_senha')
        if not nova_senha or len(nova_senha) < 6:
            return Response({'error': 'A senha deve ter no mínimo 6 caracteres.'}, status=400)

        user = request.user
        user.set_password(nova_senha)
        
        # --- DESLIGA A OBRIGATORIEDADE APÓS TROCAR ---
        user.force_password_change = False
        user.save()

        return Response({'message': 'Senha alterada com sucesso!'})