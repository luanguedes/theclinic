from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicamentoViewSet, ExameViewSet, CidViewSet

router = DefaultRouter()
router.register(r'medicamentos', MedicamentoViewSet)
router.register(r'exames', ExameViewSet)
router.register(r'cids', CidViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
