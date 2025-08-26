from typing import List, Optional, Dict
from datetime import date
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Q, Avg, ExpressionWrapper, F, FloatField, IntegerField, DecimalField , Max, Case, When, Value, BigIntegerField, Func
from django.utils import timezone
from django.db.models.functions import Now, Cast, Round
from shared.domain.value_objects import DocumentId, ClientId, Money, SellerId, EventId
from ..domain.entities import Documento, TipoDocumento, EstadoDocumento, ResumenCobranzas, Evento
from ..domain.repository import DocumentoRepository, EventoRepository
from .models import CobroMes, DocumentoModel, VentaMes, EventoModel
from shared.domain.constants import MESES_ES 
import calendar

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
            fecha_vencimiento__lt=today,
            saldo__gt=0,
            anulado=False
        )

        if seller_id.value != "-1":
            vencidos  = vencidos.filter(co_ven=seller_id.value) 
        
        
        vencidos = vencidos.aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id')
        )
        
        por_vencer = DocumentoModel.objects.filter(
            fecha_vencimiento__gte=today,
            saldo__gt=0,
            anulado=False)
        
        if seller_id.value != "-1":
            por_vencer  = por_vencer.filter(co_ven=seller_id.value) 
        
        por_vencer = por_vencer.aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id')
        )
        
        creditos = DocumentoModel.objects.filter(
            tipo='N/CR',
            saldo__gt=0,
            anulado=False
        )
        
        if seller_id.value != "-1":
            creditos  = creditos.filter(co_ven=seller_id.value)

        creditos = creditos.aggregate(
            total=Sum('saldo', default=0)
        )
        
        # # Promedio de días de vencimiento
        # dias_promedio = DocumentoModel.objects.filter(
        #     fecha_vencimiento__lt=today,
        #     saldo__gt=0,
        #     anulado=False
        # ).extra(
        #     select={'dias_vencido': 'julianday("now") - julianday(fecha_vencimiento)'}
        # ).aggregate(
        #     promedio=Avg('dias_vencido')
        # )['promedio'] or 0

        # Promedio de días de vencimiento (SQLite-specific)
        today = timezone.now().date()
        # dias_promedio = DocumentoModel.objects.filter(
        #     fecha_vencimiento__lt=today,
        #     saldo__gt=0,
        #     anulado=False
        # )

        # if seller_id.value != "-1":
        #     dias_promedio  = dias_promedio.filter(co_ven=seller_id.value)
        
        # dias_promedio = dias_promedio.annotate(
        #     dias_vencido=ExpressionWrapper(
        #         Cast(Now(), output_field=models.DateField()) - F('fecha_vencimiento'),
        #         output_field=IntegerField()
        #     )
        # ).aggregate(
        #     promedio=Avg('dias_vencido')
        # )['promedio'] or 0

        # PRUEBA 2
        # dias_promedio_query = DocumentoModel.objects.filter(
        #     anulado=False,
        #     fecha_vencimiento__lte=today,
        #     fecha_vencimiento__gte='1900-01-01'  # Restricción para evitar fechas muy antiguas
        # ).exclude(
        #     saldo=0,
        #     tipo='N/CR'
        # )

        # if seller_id.value != "-1":
        #     dias_promedio_query = dias_promedio_query.filter(co_ven=seller_id.value)

        # dias_promedio = dias_promedio_query.annotate(
        #     saldo_ajustado=Case(
        #         When(tipo='ADEL', then=-F('saldo')),
        #         default=F('saldo'),
        #         output_field=DecimalField(max_digits=12, decimal_places=2)
        #     )
        # ).values('cliente').annotate(
        #     total_saldo=Sum('saldo_ajustado'),
        #     dias_vcto=Max(
        #         Case(
        #             When(tipo='ADEL', then=Value(0)),
        #             default=Cast(
        #                 Cast(timezone.now(), output_field=models.DateField()) - F('fecha_vencimiento'),
        #                 output_field=BigIntegerField()
        #             ),
        #             output_field=BigIntegerField()
        #         )
        #     )
        # ).exclude(
        #     total_saldo=0
        # ).aggregate(
        #     promedio=Avg('dias_vcto')
        # )['promedio']

        # Round to integer if needed
        #if dias_promedio is not None:
         #   dias_promedio = round(dias_promedio)


        dias_promedio_query = DocumentoModel.objects.filter(
                anulado=False,
                fecha_vencimiento__lte=today
            ).exclude(
                tipo="N/CR",
                saldo=0
            )

        if seller_id.value != "-1":
            dias_promedio_query  = dias_promedio_query.filter(co_ven=seller_id.value)

        subquery = (
            dias_promedio_query.values("cliente")  # equivale a group by co_cli
            .annotate(
                dias_vcto=Max(
                    Case(
                        When(tipo="ADEL", then=Value(0)),
                        default=DateDiff(
                            F("fecha_vencimiento"),
                            Func(function="GETDATE")   
                        ),
                        output_field=IntegerField(),
                    )
                ),
                saldo_sum=Sum(
                    Case(
                        When(tipo="ADEL", then=F("saldo") * -1),
                        default=F("saldo"),
                        output_field=DecimalField(),
                    )
                ),
            )
            .exclude(saldo_sum=0)  # having SUM(...) <> 0
            .values("dias_vcto")
        )

        # Query final con AVG
        dias_promedio = (
            subquery.aggregate(
                dias=Round(Avg("dias_vcto"), 0)
            )
        )

        promedio_vencimiento = 0 

        if dias_promedio:
            promedio_vencimiento = dias_promedio['dias']

        # TODO: falta definir 
        promedio_ultima_factura = 0 

        dias_transcurridos = today.day
        
        ultimo_dia = calendar.monthrange(today.year, today.month)[1]

        # Cantidad de días que faltan
        dias_faltantes = ultimo_dia - today.day

        
        return ResumenCobranzas(
            total_vencido=Money(Decimal(str(vencidos['total']))),
            total_por_vencer=Money(Decimal(str(por_vencer['total']))),
            total_creditos=Money(Decimal(str(creditos['total']))),  # Los créditos son negativos
            cantidad_vencidos=vencidos['cantidad'],
            cantidad_por_vencer=por_vencer['cantidad'],
            dias_promedio_vencimiento=int(promedio_vencimiento),
            dias_promedio_ultima_factura=int(promedio_ultima_factura),
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
            tipo='CREDITO'
        ).aggregate(
            total=Sum('monto', default=0)
        )
        
        return ResumenCobranzas(
            total_vencido=Money(Decimal(str(vencidos['total']))),
            total_por_vencer=Money(Decimal(str(por_vencer['total']))),
            total_creditos=Money(Decimal(str(-abs(creditos['total'])))),
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
        
        if seller_id != "-1":
            query = query.filter(co_ven=seller_id)
        
        query = query.order_by('-fecha_vencimiento')
        
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

    def get_cobros_trimestre(self, seller_id: SellerId) -> List[Dict]:
        if seller_id.value != "-1":
            qs = (
                CobroMes.objects.filter(co_ven=seller_id.value)
                .values("cob_date")
                .annotate(amount=Sum("amount"))
                .order_by("cob_date")
            )
        else:
            qs = (
                CobroMes.objects.values("cob_date")
                .annotate(amount=Sum("amount"))
                .order_by("cob_date")
            )

        payments_list = []
        for row in qs:
            year_month = row["cob_date"]  # Ej: "202505"
            mes_num = int(year_month[4:])   # "05" → 5
            mes_nombre = MESES_ES.get(mes_num, str(mes_num))
            payments_list.append({"mes": mes_nombre, "amount": row["amount"]})

        return payments_list

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
            descripcion=model.descripcion
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