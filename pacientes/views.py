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

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        cpf = params.get('cpf')
        if cpf:
            qs = qs.filter(cpf__icontains=cpf)

        cidade = params.get('cidade')
        if cidade:
            qs = qs.filter(cidade__icontains=cidade)

        prioridade = params.get('prioridade')
        if prioridade:
            qs = qs.filter(prioridade=prioridade)

        sexo = params.get('sexo')
        if sexo:
            qs = qs.filter(sexo=sexo)

        telefone = params.get('telefone')
        if telefone:
            qs = qs.filter(telefone__icontains=telefone)

        return qs

class PacienteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    
    # --- BLINDAGEM DE SEGURANÇA ---
    authentication_classes = [JWTAuthentication] # Força aceitar o Token
    permission_classes = [permissions.IsAuthenticated]
