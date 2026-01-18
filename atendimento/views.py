from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Triagem
from .serializers import TriagemSerializer


class TriagemViewSet(viewsets.ModelViewSet):
    queryset = Triagem.objects.all().select_related('agendamento', 'agendamento__paciente')
    serializer_class = TriagemSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        agendamento_id = params.get('agendamento')
        if agendamento_id:
            qs = qs.filter(agendamento_id=agendamento_id)

        data = params.get('data')
        if data:
            qs = qs.filter(agendamento__data=data)

        profissional = params.get('profissional')
        if profissional:
            qs = qs.filter(agendamento__profissional_id=profissional)

        paciente = params.get('paciente')
        if paciente:
            qs = qs.filter(agendamento__paciente_id=paciente)

        return qs.order_by('-criado_em')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agendamento = serializer.validated_data['agendamento']
        defaults = dict(serializer.validated_data)
        defaults.pop('agendamento', None)
        defaults['realizado_por'] = request.user if request.user.is_authenticated else None

        triagem, created = Triagem.objects.update_or_create(
            agendamento=agendamento,
            defaults=defaults
        )

        out = self.get_serializer(triagem)
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
