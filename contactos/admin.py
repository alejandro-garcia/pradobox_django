from django.contrib import admin
from .infrastructure.models import CountryModel, ContactModel, ContactPhoneModel, ContactEmailModel, ContactAddressModel

# Register your models here.
@admin.register(CountryModel)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name',) 
    list_filter = ('name',)
    search_fields = ('name',)

@admin.register(ContactModel)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'first_name', 'last_name') 
    list_filter = ('name', 'first_name', 'last_name')
    search_fields = ('name', 'first_name', 'last_name')

@admin.register(ContactPhoneModel)
class ContactPhoneAdmin(admin.ModelAdmin):
    list_display = ('contact', 'phone', 'phone_type') 
    list_filter = ('contact', 'phone_type')
    search_fields = ('contact', 'phone')

@admin.register(ContactEmailModel)
class ContactEmailAdmin(admin.ModelAdmin):
    list_display = ('contact', 'email') 
    list_filter = ('contact',)
    search_fields = ('contact', 'email')

@admin.register(ContactAddressModel)
class ContactAddressAdmin(admin.ModelAdmin):
    list_display = ('contact', 'address', 'state', 'zipcode', 'country') 
    list_filter = ('contact', 'country', 'state')
    search_fields = ('contact', 'address', 'state')
