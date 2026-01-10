from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()
# Bloqueios PRIMEIRO
router.register(r'bloqueios', BloqueioAgendaViewSet, basename='bloqueios') 
# Agendamento DEPOIS
router.register(r'', AgendamentoViewSet, basename='agendamento')

urlpatterns = [
    path('', include(router.urls)),
]