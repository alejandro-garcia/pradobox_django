from django.urls import path
from . import views

urlpatterns = [
    path('documentos/', views.documentos_view, name='documentos'),
    #path('resumen/', views.resumen_cobranzas_view, name='resumen_cobranzas'),
    path('vencidos/', views.documentos_vencidos_view, name='documentos_vencidos'),
    path('pendientes/vendedor/<str:seller_id>/', views.documentos_pendientes_view, name='documentos_pendientes'),
    path('pendientes/<str:client_id>/', views.documentos_pendientes_cliente_view, name='documentos_pendientes'),
    path('eventos/<str:client_id>/', views.eventos_cliente_view, name='eventos'),
    path('detalle/<str:documento_id>/', views.documento_detalle_view, name='documento_detalle'),
    path('documento/<str:documento_id>/pdf/', views.documento_pdf_view, name='documento_pdf'),
    path('balance/<str:rif>/pdf/', views.balance_pdf_view, name='documento_pdf'),
]