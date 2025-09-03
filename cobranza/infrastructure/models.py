from django.db import models
from cliente.infrastructure.models import ClienteModel
from vendedor.infrastructure.models import VendedorModel


class DocumentoModel(models.Model):
    TIPO_CHOICES = [
        ('FACT', 'Factura'),
        ('N/DB', 'Nota de Débito'),
        ('N/CR', 'Nota de Crédito'),
        ('ADEL', 'Adelanto'),
        ('AJPM', 'Ajuste Positivo Manual'),
        ('AJMN', 'Ajuste Negativo Manual')
    ]
    
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('PAGADO', 'Pagado'),
        ('VENCIDO', 'Vencido'),
        ('ANULADO', 'Anulado'),
        ('OTRO', 'Otro')
    ]
    
    id  = models.CharField(max_length=50,primary_key=True)
    cliente = models.ForeignKey(ClienteModel, db_column='co_cli',on_delete=models.CASCADE, related_name='documentos')
    numero = models.CharField(db_column='nro_doc', max_length=50)
    tipo = models.CharField(db_column='tipo_doc', max_length=20, choices=TIPO_CHOICES)
    monto = models.DecimalField(db_column='monto_net', max_digits=12, decimal_places=2)
    saldo = models.DecimalField(db_column='saldo', max_digits=12, decimal_places=2)
    fecha_emision = models.DateField(db_column='fec_emis')
    fecha_vencimiento = models.DateField(db_column='fec_venc')
    #co_ven = models.CharField(db_column='co_ven', max_length=6, blank=True, null=True)
    estado = models.CharField(db_column='estado', max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')

    anulado = models.BooleanField(db_column='anulado', default=False)
    descripcion = models.TextField(db_column='observa', blank=True, null=True)
    empresa = models.IntegerField(db_column='empresa', blank=True, null=True)
    vendedor = models.ForeignKey(VendedorModel, db_column='co_ven',on_delete=models.CASCADE, related_name='documentos_vendedor', blank=True, null=True)
    forma_pag = models.CharField(db_column='forma_pag', max_length=6, blank=True, null=True)
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


class VentaMes(models.Model):
    id  = models.IntegerField(primary_key=True)
    co_ven = models.CharField(db_column='co_ven', max_length=6, blank=True, null=True)
    sales_date= models.CharField(db_column='mes', max_length=6, blank=False, null=False)
    amount = models.DecimalField(db_column='monto_net', max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'vw_ventas_mensuales_vendedor'
        verbose_name = 'VentasMes'
        verbose_name_plural = 'VentasMensuales'
        unique_together = ['co_ven', 'sales_date']

class CobroMes(models.Model):
    id  = models.IntegerField(primary_key=True)
    co_ven = models.CharField(db_column='co_ven', max_length=6, blank=True, null=True)
    cob_date= models.CharField(db_column='fec_cob', max_length=6, blank=False, null=False)
    amount = models.DecimalField(db_column='monto', max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'vw_cobros_mensuales_vendedor'
        verbose_name = 'CobroMes'
        verbose_name_plural = 'CobrosMensuales'
        unique_together = ['co_ven', 'cob_date']

class EventoModel(models.Model):
    id  = models.CharField(max_length=50,primary_key=True)
    co_cli = models.CharField(db_column='co_cli', max_length=10, blank=True, null=True)
    company = models.IntegerField(db_column='empresa', blank=True, null=True)
    doc_type = models.CharField(db_column='tipo_doc', max_length=4, blank=True, null=True)
    doc_number = models.IntegerField(db_column='nro_doc', blank=True, null=True)
    fec_emis = models.DateField(db_column='fec_emis', blank=False, null=False)
    fec_venc = models.DateField(db_column='fec_venc', blank=False, null=False)
    amount = models.DecimalField(db_column='monto_net', max_digits=12, decimal_places=2)
    amount_pending = models.DecimalField(db_column='saldo', max_digits=12, decimal_places=2)
    comment = models.TextField(db_column='observa', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vw_eventos'
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'
        unique_together = ['company', 'co_cli', 'doc_type', 'doc_number']