from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()

# 1. Registra os Bloqueios
router.register(r'bloqueios', BloqueioAgendaViewSet, basename='bloqueios') 

# 2. Registra o Agendamento COM O PREFIXO CORRETO
# Antes estava r'' (vazio), agora deve ser r'agendamento'
router.register(r'agendamento', AgendamentoViewSet, basename='agendamento')

urlpatterns = [
    path('', include(router.urls)),
]