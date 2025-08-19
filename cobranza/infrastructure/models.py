from django.db import models
from cliente.infrastructure.models import ClienteModel


class DocumentoModel(models.Model):
    TIPO_CHOICES = [
        ('FACT', 'Factura'),
        ('N/DB', 'Nota de Débito'),
        ('N/CR', 'Nota de Crédito'),
        ('ADEL', 'Adelanto'),
        ('AJPM', 'Ajuste Positivo Manual'),
        ('AJMN', 'Ajuste Negativo Manual')
    ]
    
    # ESTADO_CHOICES = [
    #     ('PENDIENTE', 'Pendiente'),
    #     ('PAGADO', 'Pagado'),
    #     ('VENCIDO', 'Vencido'),
    #     ('ANULADO', 'Anulado'),
    # ]
    
    id  = models.CharField(max_length=50,primary_key=True)
    cliente = models.ForeignKey(ClienteModel, db_column='co_cli',on_delete=models.CASCADE, related_name='documentos')
    numero = models.CharField(db_column='nro_doc', max_length=50)
    tipo = models.CharField(db_column='tipo_doc', max_length=20, choices=TIPO_CHOICES)
    monto = models.DecimalField(db_column='monto_net', max_digits=12, decimal_places=2)
    saldo = models.DecimalField(db_column='saldo', max_digits=12, decimal_places=2)
    fecha_emision = models.DateField(db_column='fec_emis')
    fecha_vencimiento = models.DateField(db_column='fec_venc')
    co_ven = models.CharField(db_column='co_ven', max_length=6, blank=True, null=True)
    #estado = models.CharField(db_column='estado', max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')

    anulado = models.BooleanField(db_column='anulado', default=False)
    descripcion = models.TextField(db_column='observa', blank=True, null=True)
    #created_at = models.DateTimeField(db_column='fe_us_in', auto_now_add=True)
    #updated_at = models.DateTimeField(db_column='fe_us_mo', auto_now=True)
    
    class Meta:
        managed = False
        db_table = 'docum_cc'
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
        unique_together = ['numero', 'tipo']
    
    def __str__(self):
        return f"{self.tipo} {self.numero} - {self.cliente.nombre}"