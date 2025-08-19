from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .infrastructure.models import UsuarioModel

class UsuarioModelAdmin(UserAdmin):
    model = UsuarioModel
    # Campos que verás en la lista de usuarios
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'nombre_completo')
    # Campos editables en el formulario de admin
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('nombre_completo',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('nombre_completo','codigo_vendedor_profit')}),
    )

admin.site.register(UsuarioModel, UsuarioModelAdmin)
