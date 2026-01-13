from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()

# /api/agendamento/
router.register(r'agendamento', AgendamentoViewSet, basename='agendamento')

# /api/agendamento/bloqueios/
router.register(
    r'agendamento/bloqueios',
    BloqueioAgendaViewSet,
    basename='agendamento-bloqueios'
)

urlpatterns = [
    path('', include(router.urls)),
]
