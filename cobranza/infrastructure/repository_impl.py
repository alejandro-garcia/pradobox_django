from typing import List, Optional, Dict
from datetime import date
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Q, Avg, ExpressionWrapper, F, FloatField, IntegerField, DecimalField , Max, Case, When, Value, BigIntegerField, Func
from django.utils import timezone
from django.db.models.functions import Now, Cast, Round
from shared.domain.value_objects import DocumentId, ClientId, Money, SellerId, EventId
from ..domain.entities import Documento, TipoDocumento, EstadoDocumento, ResumenCobranzas, Evento, Balance, BalanceDocument, BalanceFooter
from ..domain.repository import DocumentoRepository, EventoRepository
from .models import DocumentoModel, VentaMes, EventoModel
from shared.domain.constants import MESES_ES 
import calendar
from shared.infrastructure.logging_impl import get_logger
logger = get_logger(__name__)

class DateDiff(Func):
    function = "DATEDIFF"
    template = "%(function)s(DAY, %(expressions)s)"
    output_field = IntegerField()


class DjangoDocumentoRepository(DocumentoRepository):
    
    def save(self, entity: Documento) -> Documento:
        documento_model, created = DocumentoModel.objects.update_or_create(
            id=entity.id.value,
            defaults={
                'cliente_id': entity.cliente_id.value,
                'numero': entity.numero,
                'tipo': entity.tipo.value,
                'monto': entity.monto.amount,
                'fecha_emision': entity.fecha_emision,
                'fecha_vencimiento': entity.fecha_vencimiento,
                'estado': entity.estado.value,
                'descripcion': entity.descripcion,
                'co_ven': entity.co_ven 
            }
        )
        return self._to_domain(documento_model)
    
    def find_by_id(self, entity_id: DocumentId) -> Optional[Documento]:
        try:
            documento_model = DocumentoModel.objects.get(id=entity_id.value)
            return self._to_domain(documento_model)
        except DocumentoModel.DoesNotExist:
            return None
    
    def find_all(self) -> List[Documento]:
        documento_models = DocumentoModel.objects.all()
        return [self._to_domain(model) for model in documento_models]
    
    def delete(self, entity_id: DocumentId) -> None:
        DocumentoModel.objects.filter(id=entity_id.value).delete()
    
    def find_by_cliente(self, cliente_id: ClientId) -> List[Documento]:
        documento_models = DocumentoModel.objects.filter(cliente_id=cliente_id.value)
        return [self._to_domain(model) for model in documento_models]
    
    def find_vencidos(self) -> List[Documento]:
        today = timezone.now().date()
        documento_models = DocumentoModel.objects.filter(
            fecha_vencimiento__lt=today,
            estado='PENDIENTE'
        )
        return [self._to_domain(model) for model in documento_models]
    
    def find_by_fecha_vencimiento(self, fecha_desde: date, fecha_hasta: date) -> List[Documento]:
        documento_models = DocumentoModel.objects.filter(
            fecha_vencimiento__range=[fecha_desde, fecha_hasta]
        )
        return [self._to_domain(model) for model in documento_models]
    
    def find_by_estado(self, estado: EstadoDocumento) -> List[Documento]:
        documento_models = DocumentoModel.objects.filter(estado=estado.value)
        return [self._to_domain(model) for model in documento_models]
    
    def get_resumen_cobranzas(self, seller_id: SellerId) -> ResumenCobranzas:
        today = timezone.now().date()
        
        # Totales por estado
        vencidos = DocumentoModel.objects.filter(
            fecha_vencimiento__lte=today,
            anulado=False
        ).exclude(tipo='N/CR')

        if seller_id.value != "-1":
            vencidos  = vencidos.filter(vendedor_id=seller_id.value) 
        
        
        vencidos = vencidos.aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id'),
            dias_vencidos=Sum(DateDiff(
                            F("fecha_vencimiento"),
                            Func(function="GETDATE")   
                        ))
        )
        
        por_vencer = DocumentoModel.objects.filter(
            fecha_vencimiento__gt=today,
            anulado=False).exclude(tipo='N/CR')  # saldo__gt=0,
        
        if seller_id.value != "-1":
            por_vencer  = por_vencer.filter(vendedor_id=seller_id.value) 
        
        por_vencer = por_vencer.aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id'),
            dias_vencidos=Sum(DateDiff(
                            F("fecha_vencimiento"),
                            Func(function="GETDATE")   
                        ))

        )
        
        creditos = DocumentoModel.objects.filter(
            tipo__in=['N/CR','ADEL'],
            saldo__lt=0,
            anulado=False
        )
        
        if seller_id.value != "-1":
            creditos  = creditos.filter(vendedor_id=seller_id.value)

        creditos = creditos.aggregate(
            total=Sum('saldo', default=0)
        )

        sin_vencimiento = DocumentoModel.objects.filter(
            anulado=False,
            tipo='N/CR'
        )

        if seller_id.value != "-1":
            sin_vencimiento  = sin_vencimiento.filter(vendedor_id=seller_id.value)

        sin_vencimiento = sin_vencimiento.aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id'),
            dias_vencidos=Sum(DateDiff(
                            F("fecha_vencimiento"),
                            Func(function="GETDATE")   
                        ))
        )
        
        today = timezone.now().date()

        dias_promedio = round(vencidos["dias_vencidos"] / vencidos["cantidad"]) if vencidos["cantidad"] > 0 else 0

        dias_vencidos_total = (vencidos["dias_vencidos"] or 0) + (por_vencer["dias_vencidos"] or 0) + (sin_vencimiento["dias_vencidos"] or 0)
        cantidad_total = vencidos["cantidad"] + por_vencer["cantidad"] + (sin_vencimiento["cantidad"] or 0) 
        promedio_vcto_todos = round(dias_vencidos_total / cantidad_total) if cantidad_total > 0 else 0

        dias_transcurridos = today.day
        
        ultimo_dia = calendar.monthrange(today.year, today.month)[1]

        # Cantidad de días que faltan
        dias_faltantes = ultimo_dia - today.day

        if Decimal(str(creditos['total'])) < 0:
            creditos['total'] = Decimal(str(creditos['total'])) * -1

        
        return ResumenCobranzas(
            total_vencido=Money(Decimal(str(vencidos['total']))),
            total_por_vencer=Money(Decimal(str(por_vencer['total']))),
            total_creditos=Money(Decimal(str(creditos['total']))),  # Los créditos son negativos
            total_sinvencimiento=Money(Decimal(str(abs(sin_vencimiento['total'])))),
            cantidad_vencidos=vencidos['cantidad'],
            cantidad_total=cantidad_total,
            dias_promedio_vencimiento=dias_promedio,
            dias_promedio_vencimiento_todos=int(promedio_vcto_todos),
            dias_transcurridos= dias_transcurridos,
            dias_faltantes=dias_faltantes 
        )
    
    def get_resumen_por_cliente(self, cliente_id: ClientId) -> ResumenCobranzas:
        today = timezone.now().date()
        
        # Filtrar solo documentos del cliente
        base_query = DocumentoModel.objects.filter(cliente_id=cliente_id.value)
        
        vencidos = base_query.filter(
            fecha_vencimiento__lt=today,
            estado='PENDIENTE'
        ).aggregate(
            total=Sum('monto', default=0),
            cantidad=Count('id')
        )
        
        por_vencer = base_query.filter(
            fecha_vencimiento__gte=today,
            estado='PENDIENTE'
        ).aggregate(
            total=Sum('monto', default=0),
            cantidad=Count('id')
        )
        
        creditos = base_query.filter(
            tipo__in = ['N/CR','ADEL'],
        ).aggregate(
            total=Sum('monto', default=0)
        )
        
        return ResumenCobranzas(
            total_vencido=Money(Decimal(str(vencidos['total']))),
            total_por_vencer=Money(Decimal(str(por_vencer['total']))),
            total_creditos=Money(Decimal(str(abs(creditos['total'])))),
            cantidad_vencidos=vencidos['cantidad'],
            cantidad_por_vencer=por_vencer['cantidad'],
            dias_promedio_vencimiento=0  # Calcular si es necesario
        )
    

    def find_documentos_pendientes(self, seller_id: str) -> List[Documento]:
        """Obtiene todos los documentos pendientes (vencidos y por vencer) con información del cliente"""
        query = DocumentoModel.objects.select_related('cliente').filter(
            saldo__gt=0,
            anulado=False
        )
        
        if seller_id != '' and seller_id != "-1":
            query = query.filter(vendedor_id=seller_id)
        
        query = query.order_by('fecha_vencimiento')
        
        documentos = []
        for model in query:
            documento = self._to_domain(model)
            # Agregar nombre del cliente como atributo adicional
            documento.cliente_nombre = model.cliente.nombre
            documentos.append(documento)
        
        return documentos
    
    def find_documentos_pendientes_cliente(self, client_id: str) -> List[Documento]:
        """Obtiene todos los documentos pendientes (vencidos y por vencer) con información del cliente"""
        query = DocumentoModel.objects.select_related('cliente').filter(
            saldo__gt=0,
            anulado=False,
            cliente_id=client_id
        ).order_by('-fecha_emision')
        
      
        documentos = []
        for model in query:
            documento = self._to_domain(model)
            # Agregar nombre del cliente como atributo adicional
            documento.cliente_nombre = model.cliente.nombre
            documentos.append(documento)
        
        return documentos

    def get_ventas_trimestre(self, seller_id: SellerId) -> List[Dict]:
        if seller_id.value != "-1":
            qs = (
                VentaMes.objects.filter(co_ven=seller_id.value)
                .values("sales_date")
                .annotate(amount=Sum("amount"))
                .order_by("sales_date")
            )
        else:
            qs = (
                VentaMes.objects.values("sales_date")
                .annotate(amount=Sum("amount"))
                .order_by("sales_date")
            )

        sales_list = []
        for row in qs:
            year_month = row["sales_date"]  # Ej: "202505"
            mes_num = int(year_month[4:])   # "05" → 5
            mes_nombre = MESES_ES.get(mes_num, str(mes_num))
            sales_list.append({"mes": mes_nombre, "amount": row["amount"]})

        return sales_list
    
    def get_detalle_documento(self, documento_id: str) -> Optional[Documento]:
        """Obtiene el detalle completo de un documento incluyendo productos y vendedor"""
        try:
            empresa, tipo, doc_id = documento_id.split('_')

            model = DocumentoModel.objects.select_related('cliente').get(empresa=empresa, tipo=tipo, numero=doc_id)
            documento = self._to_domain(model)
            
            # Agregar información adicional
            documento.cliente_nombre = model.cliente.nombre
            documento.vendedor_nombre = model.vendedor.nombre  
            documento.productos = self._get_productos_documento(empresa, tipo, doc_id)
            documento.subtotal = model.monto
            documento.descuentos = Decimal('0')  # TODO: obtener de tabla de descuentos
            documento.impuestos = Decimal('0')   # TODO: obtener de tabla de impuestos
            documento.total = model.monto
            documento.saldo = model.saldo
            documento.comentarios = model.descripcion or ''
            documento.cliente_rif = model.cliente.rif or ''
            documento.condicion_pago = self._get_condicion_pago(model.forma_pag) 
            
            return documento
            
        except DocumentoModel.DoesNotExist:
            return None
        
    def get_estado_cuenta(self, rif: str) -> Balance:
        """Genera el estado de cuenta para un cliente identificado por su RIF"""
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    EXECUTE dbo.pp_consulta_edo_cuenta_bot %s, '-1', -1 
                """, [rif])
                
                documentos = []
                cliente_nombre = ''
                vendedor_nombre = ''

                rows = cursor.fetchall()

                for i, row in enumerate(rows, start=1):
                    rif, cliente, vendedor, tipo, nro_doc, fec_emis, fec_venc, dias_ven, saldo, cobrado, total_neto = row
                    if i == 1:
                        cliente_nombre = cliente
                        vendedor_nombre = vendedor

                    documentos.append(BalanceDocument(
                        tipo_doc=tipo,
                        numero=nro_doc,
                        fecha_emision=fec_emis,
                        fecha_vencimiento=fec_venc,
                        total_neto=total_neto,
                        cobrado=cobrado,
                        saldo=saldo
                    ))
                
                cursor.nextset()
                footers = []
                for row in cursor.fetchall():
                    descripcion, valor = row
                    footers.append(BalanceFooter(descripcion=descripcion, amount=valor))

                balance = Balance(
                    cliente=cliente_nombre,
                    vendedor=vendedor_nombre,
                    fecha=date.today(),
                    renglones=documentos,
                    resumen=footers
                )
                
                return balance
                
        except Exception as e:
            logger.error(f"Error generando estado de cuenta: {str(e)}")
            print(f"Error generando estado de cuenta: {e}")
            return Balance(
                cliente=rif,
                vendedor='',
                fecha=date.today(),
                documentos=[],
                resumen=BalanceFooter(descripcion='', amount='0.00')
            )

            
    def _get_condicion_pago(self, co_cond: str) -> str:
        """Obtiene la descripcion de la condición de pago desde la base de datos"""
        if not co_cond:
            return "Sin asignar"
        
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT ltrim(rtrim(cond_des)) as cond_des FROM condicio WHERE co_cond = %s", [co_cond])
                row = cursor.fetchone()
                return row[0] if row else f"Cond.Pago: {co_cond}"
        except Exception as e:
            print(f"Error obteniendo condición de pago: {str(e)}")
            return f"Cond.Pago: {co_cond}"
    
    def _get_productos_documento(self, empresa: int, tipo: str, documento_id: int) -> List[dict]:
        """Obtiene los productos asociados al documento"""
        try:
            from django.db import connection
            with connection.cursor() as cursor:               
                cursor.execute("""
                    SELECT 
                        art_des,
                        co_art,
                        total_art,
                        prec_vta,
                        (total_art * prec_vta) as subtotal,
                        uni_venta
                    FROM vw_renglones_documento 
                    WHERE empresa = %s AND tipo_doc = %s AND nro_doc = %s
                    ORDER BY reng_num
                """, [empresa, tipo, documento_id])
                
                productos = []
                for row in cursor.fetchall():
                    productos.append({
                        'descripcion': row[0],
                        'codigo': row[1],
                        'cantidad': float(row[2]),
                        'precio_unitario': float(row[3]),
                        'subtotal': float(row[4]),
                        'unidad': row[5]
                    })
                
                return productos
                
        except Exception as e:
            logger.error(f"Error obteniendo productos: {str(e)}")
            print(f"Error obteniendo productos: {e}")
            return []


    def _to_domain(self, model: DocumentoModel) -> Documento:
        return Documento(
            id=DocumentId(model.id),
            cliente_id=ClientId(model.cliente_id),
            numero=model.numero,
            tipo=TipoDocumento(model.tipo),
            monto=Money(model.monto),
            fecha_emision=model.fecha_emision,
            fecha_vencimiento=model.fecha_vencimiento,
            estado=EstadoDocumento(model.estado),
            descripcion=model.descripcion,
            empresa=model.empresa,
            vendedor_id=SellerId(model.vendedor_id) if model.vendedor_id else None,
            forma_pag=model.forma_pag
        )
    
    
class DjangoEventoRepository(EventoRepository):
    def find_all(self) -> List[Documento]:
        evento_models = EventoModel.objects.all()
        return [self._to_domain(model) for model in evento_models]
    
    def find_by_id(self, entity_id):
        evento_models = EventoModel.objects.find(id=entity_id.value)
        return [self._to_domain(model) for model in evento_models]
    
    def find_eventos_cliente(self, client_id: str) -> List[Evento]:

        query = EventoModel.objects.filter(co_cli=client_id)

        eventos = []
        
        for row in query:
            evento = self._to_domain(row)
            eventos.append(evento)
        
        return eventos
    
    def _to_domain(self, model: EventoModel) -> Evento:
        return Evento(
            id=EventId(model.id),
            cliente_id=ClientId(model.co_cli),
            company_id=model.company,
            tipo=TipoDocumento(model.doc_type),
            numero=model.doc_number,
            fecha_emision=model.fec_emis,
            fecha_vencimiento=model.fec_venc,
            monto=Money(model.amount),
            saldo=Money(model.amount_pending),
            descripcion=model.comment
        )