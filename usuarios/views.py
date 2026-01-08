from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import ConfiguracaoSistema
from .serializers import OperadorSerializer, OperadorListSerializer, ConfiguracaoSerializer

class NovoOperadorView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = OperadorSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

class DetalheOperadorView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = OperadorSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated] # Ou IsAdminUser se preferir

    def update(self, request, *args, **kwargs):
        # Lógica especial para update: se a senha não vier, não muda
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Removemos a senha do request se ela vier vazia
        if 'password' in request.data and not request.data['password']:
            request.data._mutable = True
            request.data.pop('password')
            request.data._mutable = False
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Atualiza campos do Perfil Manualmente
        if hasattr(instance, 'perfil'):
            p = instance.perfil
            p.acesso_atendimento = request.data.get('acesso_atendimento', p.acesso_atendimento)
            p.acesso_agendamento = request.data.get('acesso_agendamento', p.acesso_agendamento)
            p.acesso_faturamento = request.data.get('acesso_faturamento', p.acesso_faturamento)
            p.force_password_change = request.data.get('force_password_change', p.force_password_change)
            p.save()

        return Response(serializer.data)

class MeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try: perfil = user.perfil 
        except: perfil = None

        data = {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "is_superuser": user.is_superuser,
            "acesso_atendimento": perfil.acesso_atendimento if perfil else False,
            "acesso_agendamento": perfil.acesso_agendamento if perfil else False,
            "acesso_faturamento": perfil.acesso_faturamento if perfil else False,
            "force_password_change": perfil.force_password_change if perfil else False,
        }
        return Response(data)

class ListarOperadoresView(generics.ListAPIView):
    queryset = User.objects.all().order_by('first_name')
    serializer_class = OperadorListSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'email']

class ConfiguracaoView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try: config = ConfiguracaoSistema.load()
        except: config = ConfiguracaoSistema(itens_por_pagina=15)
        return Response(ConfiguracaoSerializer(config).data)

    def put(self, request):
        config = ConfiguracaoSistema.load()
        serializer = ConfiguracaoSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class TrocarSenhaView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        nova_senha = request.data.get('nova_senha')
        if not nova_senha or len(nova_senha) < 6:
            return Response({'error': 'A senha deve ter no mínimo 6 caracteres.'}, status=400)

        user = request.user
        user.set_password(nova_senha)
        user.save()

        if hasattr(user, 'perfil'):
            user.perfil.force_password_change = False
            user.perfil.save()

        return Response({'message': 'Senha alterada com sucesso!'})