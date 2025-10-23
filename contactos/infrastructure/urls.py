from django.urls import path
from . import views

urlpatterns = [
    path('<str:client_id>/', views.contacts_by_client_view, name='contacts-by-client'),
    path('', views.create_contact_view, name='create-contact'),
    path('<int:contact_id>/', views.update_contact_view, name='update-contact'),
    path('tlf/add/', views.create_phone_view, name='create-phone'),
    path('tlf/<int:phone_id>/', views.update_phone_view, name='update-phone'),
    path('tlf/<int:phone_id>/delete/', views.delete_phone_view, name='delete-phone'),
    path('mail/add/', views.create_mail_view, name='create-mail'),
    path('mail/<int:mail_id>/', views.update_mail_view, name='update-mail'),
    path('mail/<int:mail_id>/delete/', views.delete_mail_view, name='delete-mail'),
    path('direccion/add/', views.create_address_view, name='create-address'),
    path('direccion/<int:address_id>/', views.update_address_view, name='update-address'),
    path('direccion/<int:address_id>/delete/', views.delete_address_view, name='delete-address'),
]
