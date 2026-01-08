from django.urls import path
from .views import (
    NovoOperadorView, 
    MeView, 
    ListarOperadoresView, 
    ConfiguracaoView, 
    TrocarSenhaView,
    DetalheOperadorView
)

urlpatterns = [
    path('novo/', NovoOperadorView.as_view()),
    path('me/', MeView.as_view()),
    path('listar/', ListarOperadoresView.as_view()),
    path('config/', ConfiguracaoView.as_view()),
    path('trocar-senha/', TrocarSenhaView.as_view()),
    path('<int:pk>/', DetalheOperadorView.as_view()),
]