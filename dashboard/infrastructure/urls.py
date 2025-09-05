from django.urls import path
from . import views

#  path('', views.dashboard_view, name='dashboard'),
urlpatterns = [
    path('<str:seller_id>/', views.dashboard_seller_view, name='sellerdashboard'),
]