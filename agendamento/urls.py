from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()

# 1. Registra os Bloqueios (URL final: /api/bloqueios/)
router.register(r'bloqueios', BloqueioAgendaViewSet, basename='bloqueios')

# 2. Registra o Agendamento (URL final: /api/agendamento/)
# O 'r'agendamento' é OBRIGATÓRIO aqui para funcionar com o passo 2 abaixo
router.register(r'agendamento', AgendamentoViewSet, basename='agendamento')

urlpatterns = [
    path('', include(router.urls)),
]