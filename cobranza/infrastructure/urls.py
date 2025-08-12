from django.urls import path
from . import views

urlpatterns = [
    path('documentos/', views.documentos_view, name='documentos'),
    path('resumen/', views.resumen_cobranzas_view, name='resumen_cobranzas'),
    path('vencidos/', views.documentos_vencidos_view, name='documentos_vencidos'),
]