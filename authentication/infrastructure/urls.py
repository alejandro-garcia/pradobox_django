from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('validate-token/', views.validate_token_view, name='validate_token'),
    path('logout/', views.logout_view, name='logout'),
    path('change-password/', views.change_password_view, name='change_password'),
]