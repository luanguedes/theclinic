from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from usuarios.views import MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- AUTENTICAÇÃO ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/me/', MeView.as_view(), name='me'),

    # --- MÓDULOS ESPECÍFICOS (Devem vir ANTES de rotas genéricas) ---
    path('api/pacientes/', include('pacientes.urls')),
    path('api/operadores/', include('usuarios.urls')), 
    path('api/configuracoes/', include('configuracoes.urls')),
    
    # Agendamento e Agendas
    path('api/agendamento/', include('agendamento.urls')), 
    path('api/agendas/', include('agendas.urls')),

    path('api/profissionais/', include('profissionais.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)