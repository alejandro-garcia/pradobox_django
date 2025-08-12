from django.urls import path
from . import views

urlpatterns = [
    path('', views.clientes_view, name='clientes'),
    path('<str:cliente_id>/', views.cliente_detail_view, name='cliente_detail'),
    path('<str:cliente_id>/resumen/', views.cliente_resumen_view, name='cliente_resumen'),
]