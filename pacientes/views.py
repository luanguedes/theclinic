from rest_framework import generics, permissions, filters
from rest_framework_simplejwt.authentication import JWTAuthentication # <--- IMPORTANTE
from .models import Paciente
from .serializers import PacienteSerializer

class PacienteListCreateView(generics.ListCreateAPIView):
    queryset = Paciente.objects.all().order_by('-criado_em')
    serializer_class = PacienteSerializer
    
    # --- BLINDAGEM DE SEGURANÇA ---
    authentication_classes = [JWTAuthentication] # Força aceitar o Token
    permission_classes = [permissions.IsAuthenticated]
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome', 'cpf', 'telefone', 'cidade']

class PacienteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    
    # --- BLINDAGEM DE SEGURANÇA ---
    authentication_classes = [JWTAuthentication] # Força aceitar o Token
    permission_classes = [permissions.IsAuthenticated]