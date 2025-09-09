from django.db import models


class ClienteModel(models.Model):
    id = models.CharField(db_column='co_cli', max_length=50, primary_key=True)
    nombre = models.CharField(db_column='cli_des', max_length=200)
    rif = models.CharField(max_length=20, unique=True)
    rif2 = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(db_column='telefonos', max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    dias_ult_fact = models.IntegerField(db_column='dias_ult_fact', blank=True, null=True)
    vencido = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ventas_ultimo_trimestre = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    #co_ven = models.CharField(db_column='co_ven', max_length=6, blank=True, null=True)
    vendedor = models.ForeignKey('vendedor.VendedorModel', db_column='co_ven', on_delete=models.CASCADE, related_name='cliente_vendedor', blank=True, null=True)
    plaz_pag = models.IntegerField(db_column='plaz_pag', blank=True, null=True)

    #created_at = models.DateTimeField(db_column='fe_us_in', auto_now_add=True)
    #updated_at = models.DateTimeField(db_column='fe_us_mo', auto_now=True)
    
    class Meta:
        managed = False
        db_table = 'clientes'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
    
    def __str__(self):
        return f"{self.nombre} ({self.rif})"