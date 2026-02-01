from rest_framework import generics, permissions, filters
from rest_framework_simplejwt.authentication import JWTAuthentication # <--- IMPORTANTE
from django.utils import timezone
from django.db.models import Case, When, Value, IntegerField
from agendamento.models import Agendamento
from agendamento.serializers import AgendamentoSerializer
from .models import Paciente
from .serializers import PacienteSerializer
from clinica_core.filters import AccentInsensitiveSearchFilter

class PacienteListCreateView(generics.ListCreateAPIView):
    queryset = Paciente.objects.all().order_by('-criado_em')
    serializer_class = PacienteSerializer

    # --- BLINDAGEM DE SEGURANCA ---
    authentication_classes = [JWTAuthentication] # Forca aceitar o Token
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [AccentInsensitiveSearchFilter]
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

class PacienteAtendimentoListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _parse_bool(self, value):
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if normalized in ['1', 'true', 'yes', 'sim']:
            return True
        if normalized in ['0', 'false', 'no', 'nao']:
            return False
        return None

    def _has_atendimento_access(self, user):
        return bool(
            user
            and (
                getattr(user, 'is_superuser', False)
                or getattr(user, 'profissional_id', None)
            )
        )

    def get_queryset(self):
        if not self._has_atendimento_access(self.request.user):
            return Agendamento.objects.none()

        qs = Agendamento.objects.all().select_related(
            'paciente', 'profissional', 'especialidade', 'triagem'
        ).filter(
            status__in=[
                Agendamento.Status.AGUARDANDO,
                Agendamento.Status.EM_ATENDIMENTO,
                Agendamento.Status.FINALIZADO,
            ]
        )

        data = self.request.query_params.get('data')
        if data:
            qs = qs.filter(data=data)
        else:
            qs = qs.filter(data=timezone.localdate())

        if self.request.user.profissional_id:
            qs = qs.filter(profissional_id=self.request.user.profissional_id)

        apenas_triados = self._parse_bool(self.request.query_params.get('apenas_triados'))
        if apenas_triados is True:
            qs = qs.filter(triagem__isnull=False)

        qs = qs.annotate(
            prioridade_status=Case(
                When(status=Agendamento.Status.EM_ATENDIMENTO, then=Value(1)),
                When(status=Agendamento.Status.AGUARDANDO, then=Value(2)),
                When(status=Agendamento.Status.FINALIZADO, then=Value(3)),
                default=Value(10),
                output_field=IntegerField(),
            )
        )

        return qs.order_by('prioridade_status', 'horario')

class PacienteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer

    # --- BLINDAGEM DE SEGURANCA ---
    authentication_classes = [JWTAuthentication] # Forca aceitar o Token
    permission_classes = [permissions.IsAuthenticated]
