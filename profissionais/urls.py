from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EspecialidadeViewSet, ProfissionalViewSet, CboImportView

router = DefaultRouter()
router.register(r'especialidades', EspecialidadeViewSet, basename='especialidade')
router.register(r'profissionais', ProfissionalViewSet, basename='profissional')


urlpatterns = [
    path('especialidades/importar_cbo/', CboImportView.as_view(), name='importar-cbo'),
    path('', include(router.urls)),
]
