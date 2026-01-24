from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import WhatsappConversaViewSet

router = DefaultRouter()
router.register('whatsapp/conversas', WhatsappConversaViewSet, basename='whatsapp-conversas')

urlpatterns = [
    path('', include(router.urls)),
]
