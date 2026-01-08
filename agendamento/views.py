from rest_framework import viewsets, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Agendamento
from .serializers import AgendamentoSerializer

class AgendamentoViewSet(viewsets.ModelViewSet):
    queryset = Agendamento.objects.all()
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        profissional = self.request.query_params.get('profissional')
        especialidade = self.request.query_params.get('especialidade')
        data = self.request.query_params.get('data')
        
        # BLINDAGEM: Só filtra se o valor não for nulo E não for string vazia
        if profissional and profissional != 'undefined':
            queryset = queryset.filter(profissional_id=profissional)
        
        if especialidade and especialidade != 'undefined':
            queryset = queryset.filter(especialidade_id=especialidade)
            
        if data and data != 'undefined':
            queryset = queryset.filter(data=data)

        return queryset