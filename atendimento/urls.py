from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TriagemViewSet,
    AtendimentoMedicoViewSet,
    AtendimentoIniciarView,
    AtendimentoSalvarView,
    AtendimentoPdfView,
)

router = DefaultRouter()
router.register(r'triagens', TriagemViewSet, basename='triagens')
router.register(r'medicos', AtendimentoMedicoViewSet, basename='atendimento-medico')

urlpatterns = [
    path('', include(router.urls)),
    path('iniciar/<int:paciente_id>/', AtendimentoIniciarView.as_view(), name='atendimento-iniciar'),
    path('salvar/', AtendimentoSalvarView.as_view(), name='atendimento-salvar'),
    path('gerar-pdf/', AtendimentoPdfView.as_view(), name='atendimento-gerar-pdf'),
]
