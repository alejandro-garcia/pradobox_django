from django.urls import path
from . import views

urlpatterns = [
    path('', views.clientes_view, name='clientes'),
    path('vendedor/<str:seller_id>', views.clients_by_seller, name='clientes_vendedor'),
    path('<str:cliente_id>/', views.cliente_detail_view, name='cliente_detail'),
    path('<str:cliente_id>/resumen/', views.cliente_resumen_view, name='cliente_resumen'),
]