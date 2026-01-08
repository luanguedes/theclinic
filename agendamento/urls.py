from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendamentoViewSet

router = DefaultRouter()
# Isso vai gerar a rota: /api/agendamentos/ (vazia pois o prefixo já está no include principal)
router.register(r'', AgendamentoViewSet, basename='agendamento')

urlpatterns = [
    path('', include(router.urls)),
]