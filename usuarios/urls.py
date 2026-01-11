from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OperadorViewSet, TrocarSenhaView

# Cria o roteador automático para listar, criar, editar e deletar
router = DefaultRouter()
router.register(r'', OperadorViewSet, basename='operador')

urlpatterns = [
    # Inclui todas as rotas geradas pelo router
    path('trocar-senha/', TrocarSenhaView.as_view(), name='trocar-senha'),
    path('', include(router.urls)),
]