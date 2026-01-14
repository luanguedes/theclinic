from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OperadorViewSet, TrocarSenhaView, PrivilegioListView, PrivilegioSyncView

# Cria o roteador automático para listar, criar, editar e deletar
router = DefaultRouter()
router.register(r'', OperadorViewSet, basename='operador')

urlpatterns = [
    # Inclui todas as rotas geradas pelo router
    path('privilegios/', PrivilegioListView.as_view(), name='privilegios-list'),
    path('privilegios/sync/', PrivilegioSyncView.as_view(), name='privilegios-sync'),
    path('trocar-senha/', TrocarSenhaView.as_view(), name='trocar-senha'),
    path('', include(router.urls)),
]
