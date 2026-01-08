from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# --- ADICIONE ESTA IMPORTAÇÃO ---
from usuarios.views import MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rotas de Autenticação (Login)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- ROTA CORRIGIDA (Direta) ---
    # Aponta direto para a View, garantindo que o endereço seja exatamente /api/me/
    path('api/me/', MeView.as_view(), name='me'),

    # Rotas dos Módulos
    path('api/pacientes/', include('pacientes.urls')),
    
    # Rota para criar operadores (api/operadores/novo/)
    path('api/operadores/', include('usuarios.urls')), 

    path('api/', include('profissionais.urls')),

    path('api/configuracoes/', include('configuracoes.urls')),

    path('api/agendamento/', include('agendamento.urls')), # Marcação de consulta
    path('api/agendas/', include('agendas.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)