from django.urls import include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()

# /api/agendamentos/
router.register(r'agendamentos', AgendamentoViewSet, basename='agendamento')

# /api/bloqueios/
router.register(r'bloqueios', BloqueioAgendaViewSet, basename='bloqueios')

urlpatterns = router.urls
