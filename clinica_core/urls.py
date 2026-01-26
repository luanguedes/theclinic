from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from usuarios.views import MeView
from clinica_core.webhooks import EvolutionWebhookView

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/me/', MeView.as_view()),
    path('api/webhooks/whatsapp/<str:instance_name>/', EvolutionWebhookView.as_view()),
    path('api/webhooks/whatsapp/<str:instance_name>', EvolutionWebhookView.as_view()),

    path('api/pacientes/', include('pacientes.urls')),
    path('api/operadores/', include('usuarios.urls')),
    path('api/configuracoes/', include('configuracoes.urls')),
    path('api/cadastros/', include('configuracoes.cadastros_urls')),
    path('api/auditoria/', include('auditoria.urls')),

    #  routers "puros" primeiro
    path('api/', include('profissionais.urls')),
    path('api/', include('whatsapp.urls')),

    #  depois agendamento
    path('api/', include('agendamento.urls')),

    path('api/agendas/', include('agendas.urls')),
    path('api/atendimento/', include('atendimento.urls')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
