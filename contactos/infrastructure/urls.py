from django.urls import path
from . import views

urlpatterns = [
    path('<str:client_id>/', views.contacts_by_client_view, name='contacts-by-client'),
    path('', views.create_contact_view, name='create-contact'),
    path('<int:contact_id>/', views.update_contact_view, name='update-contact'),
    path('tlf/', views.create_phone_view, name='create-phone'),
    path('tlf/<int:phone_id>/', views.update_phone_view, name='update-phone'),
    path('tlf/<int:phone_id>/delete/', views.delete_phone_view, name='delete-phone'),
]
