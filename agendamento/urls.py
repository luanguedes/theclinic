from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()


router.register(
    r'agendamento',
    AgendamentoViewSet,
    basename='agendamento'
)

router.register(
    r'bloqueios',
    BloqueioAgendaViewSet,
    basename='bloqueios'
)


urlpatterns = [
    path('', include(router.urls)),
]
