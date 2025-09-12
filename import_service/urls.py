from django.urls import path
from . import views

urlpatterns = [
    path('documentos/', views.import_documentos_view, name='import_documentos'),
    path('clientes/', views.import_clientes_view, name='import_clientes'),
    path('sellers/', views.import_sellers_view, name='import_sellers'),
    path('custom-query/', views.execute_custom_query_view, name='custom_query'),
    path('document-details/', views.import_document_details, name='docs_details'),
    path('month-sales/', views.import_month_sales_view, name='month_sales')
]