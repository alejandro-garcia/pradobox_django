from typing import List, Optional
from datetime import date
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Q, Avg, ExpressionWrapper, F, FloatField, IntegerField
from django.utils import timezone
from django.db.models.functions import Now, Cast
from shared.domain.value_objects import DocumentId, ClientId, Money
from ..domain.entities import Documento, TipoDocumento, EstadoDocumento, ResumenCobranzas
from ..domain.repository import DocumentoRepository
from .models import DocumentoModel


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
    
    def get_resumen_cobranzas(self) -> ResumenCobranzas:
        today = timezone.now().date()
        
        # Totales por estado
        vencidos = DocumentoModel.objects.filter(
            fecha_vencimiento__lt=today,
            saldo__gt=0,
            anulado=False
        ).aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id')
        )
        
        por_vencer = DocumentoModel.objects.filter(
            fecha_vencimiento__gte=today,
            saldo__gt=0,
            anulado=False
        ).aggregate(
            total=Sum('saldo', default=0),
            cantidad=Count('id')
        )
        
        creditos = DocumentoModel.objects.filter(
            tipo='N/CR',
            saldo__gt=0,
            anulado=False
        ).aggregate(
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
        dias_promedio = DocumentoModel.objects.filter(
            fecha_vencimiento__lt=today,
            saldo__gt=0,
            anulado=False
        ).annotate(
            dias_vencido=ExpressionWrapper(
                Cast(Now(), output_field=models.DateField()) - F('fecha_vencimiento'),
                output_field=IntegerField()
            )
        ).aggregate(
            promedio=Avg('dias_vencido')
        )['promedio'] or 0
        
        return ResumenCobranzas(
            total_vencido=Money(Decimal(str(vencidos['total']))),
            total_por_vencer=Money(Decimal(str(por_vencer['total']))),
            total_creditos=Money(Decimal(str(creditos['total']))),  # Los créditos son negativos
            cantidad_vencidos=vencidos['cantidad'],
            cantidad_por_vencer=por_vencer['cantidad'],
            dias_promedio_vencimiento=int(dias_promedio)
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