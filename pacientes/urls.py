from django.urls import path
from .views import PacienteListCreateView, PacienteDetailView, PacienteAtendimentoListView

urlpatterns = [
    # Esta linha garante que /api/pacientes/ funcione para o POST/GET padrão
    path('', PacienteListCreateView.as_view(), name='pacientes-list-create'),
    
    # Esta linha atende ao erro 404 do seu log (MarcarConsulta.jsx:80)
    path('lista/', PacienteListCreateView.as_view(), name='pacientes-list'),

    path('atendimento/', PacienteAtendimentoListView.as_view(), name='pacientes-atendimento'),
    
    path('<int:pk>/', PacienteDetailView.as_view(), name='paciente-detail'),
]
