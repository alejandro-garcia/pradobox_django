from django.db import models


class VendedorModel(models.Model):
    id = models.CharField(db_column='co_ven', max_length=50, primary_key=True)
    nombre = models.CharField(db_column='ven_des', max_length=200)
    cedula = models.CharField(db_column='cedula', max_length=16)
    telefono = models.CharField(db_column='telefonos', max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vendedor'
        verbose_name = 'Vendedor'
        verbose_name_plural = 'Vendedores'
    
    def __str__(self):
        return f"{self.nombre} ({self.id})"