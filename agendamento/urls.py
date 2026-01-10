# ARQUIVO: agendamento/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet, BloqueioAgendaViewSet

router = DefaultRouter()

# --- CORREÇÃO: Bloqueios vem PRIMEIRO ---
router.register(r'bloqueios', BloqueioAgendaViewSet, basename='bloqueios') 

# --- A rota vazia (catch-all) vem POR ÚLTIMO ---
router.register(r'', AgendamentoViewSet, basename='agendamento')

urlpatterns = [
    path('', include(router.urls)),
]