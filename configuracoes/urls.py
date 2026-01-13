from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConvenioViewSet, DadosClinicaView, ConfiguracaoSistemaView, WhatsAppStatusView

router = DefaultRouter()
router.register(r'convenios', ConvenioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('clinica/', DadosClinicaView.as_view()),
    
    # Rota base das configurações
    path('sistema/', ConfiguracaoSistemaView.as_view(), name='config-sistema'),
    
    # --- NOVA ROTA PARA O DISPARO MANUAL ---
    path('sistema/executar_lembretes/', ConfiguracaoSistemaView.as_view(), name='executar-lembretes'),
    path('sistema/whatsapp_status/', WhatsAppStatusView.as_view(), name='whatsapp-status'),
]
