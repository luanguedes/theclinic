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

    # --- MÓDULOS ESPECÍFICOS ---
    path('api/pacientes/', include('pacientes.urls')),
    path('api/operadores/', include('usuarios.urls')), 
    path('api/configuracoes/', include('configuracoes.urls')),
    
    # --- CORREÇÃO CRÍTICA AQUI ---
    # Mudamos de 'api/agendamento/' para 'api/'
    # Como o router interno já tem r'agendamento', a URL final fica correta: /api/agendamento/
    path('api/', include('agendamento.urls')), 
    
    path('api/agendas/', include('agendas.urls')),

    # --- MÓDULO DE PROFISSIONAIS E ESPECIALIDADES (POR ÚLTIMO) ---
    path('api/', include('profissionais.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)