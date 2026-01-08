from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgendaConfigViewSet

router = DefaultRouter()
# Isso vai gerar a rota: /api/agendas/config/
router.register(r'config', AgendaConfigViewSet, basename='config')

urlpatterns = [
    path('', include(router.urls)),
]