from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TriagemViewSet

router = DefaultRouter()
router.register(r'triagens', TriagemViewSet, basename='triagens')

urlpatterns = [
    path('', include(router.urls)),
]
