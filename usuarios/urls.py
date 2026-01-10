from django.urls import path
from .views import (
    NovoOperadorView, 
    MeView, 
    ListarOperadoresView, 
    ConfiguracaoView, 
    TrocarSenhaView,
    DetalheOperadorView
)

router = DefaultRouter()

router.register(r'', OperadorViewSet, basename='operador')

urlpatterns = [
    path('', include(router.urls)),
]