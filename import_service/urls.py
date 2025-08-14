from django.urls import path
from . import views

urlpatterns = [
    path('documentos/', views.import_documentos_view, name='import_documentos'),
    path('clientes/', views.import_clientes_view, name='import_clientes'),
    path('custom-query/', views.execute_custom_query_view, name='custom_query'),
]