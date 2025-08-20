from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('<str:seller_id>/', views.dashboard_seller_view, name='sellerdashboard'),
]