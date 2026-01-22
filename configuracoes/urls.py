from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConvenioViewSet,
    DadosClinicaView,
    ConfiguracaoSistemaView,
    WhatsAppStatusView,
    WhatsAppQRCodeView,
    MedicamentoViewSet,
    ExameViewSet,
    ImportacaoTabelasView,
)

router = DefaultRouter()
router.register(r'convenios', ConvenioViewSet)
router.register(r'medicamentos', MedicamentoViewSet)
router.register(r'exames', ExameViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('clinica/', DadosClinicaView.as_view()),
    
    # Rota base das configurações
    path('sistema/', ConfiguracaoSistemaView.as_view(), name='config-sistema'),
    
    # --- NOVA ROTA PARA O DISPARO MANUAL ---
    path('sistema/executar_lembretes/', ConfiguracaoSistemaView.as_view(), name='executar-lembretes'),
    path('sistema/whatsapp_status/', WhatsAppStatusView.as_view(), name='whatsapp-status'),
    path('sistema/whatsapp_qrcode/', WhatsAppQRCodeView.as_view(), name='whatsapp-qrcode'),
    path('importacao/tabelas/', ImportacaoTabelasView.as_view(), name='importacao-tabelas'),
]
