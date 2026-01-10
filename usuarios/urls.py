from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OperadorViewSet

# Cria o roteador automático para listar, criar, editar e deletar
router = DefaultRouter()
router.register(r'', OperadorViewSet, basename='operador')

urlpatterns = [
    # Inclui todas as rotas geradas pelo router
    path('', include(router.urls)),
]