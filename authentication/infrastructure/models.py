from django.contrib.auth.models import AbstractUser
from django.db import models


class UsuarioModel(AbstractUser):
    nombre_completo = models.CharField(max_length=200, blank=True)
    codigo_vendedor_profit = models.CharField(max_length=6, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return f"{self.username} - {self.nombre_completo}"