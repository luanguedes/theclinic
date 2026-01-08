from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConvenioViewSet, DadosClinicaView

router = DefaultRouter()
router.register(r'convenios', ConvenioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('clinica/', DadosClinicaView.as_view()),
]