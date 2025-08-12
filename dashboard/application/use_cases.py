from shared.application.use_case import UseCase
from cobranza.domain.repository import DocumentoRepository
from .dtos import DashboardResponse, SituacionGeneralResponse, VentasMesResponse, CobrosMesResponse, IndicadoresResponse
from decimal import Decimal


class ObtenerDashboardUseCase(UseCase[None, DashboardResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, _: None) -> DashboardResponse:
        # Obtener resumen de cobranzas
        resumen = self.documento_repository.get_resumen_cobranzas()
        
        # Datos simulados para ventas y cobros por mes
        ventas_por_mes = [
            VentasMesResponse(mes="may", monto=Decimal('155000')),
            VentasMesResponse(mes="jun", monto=Decimal('144000')),
            VentasMesResponse(mes="jul", monto=Decimal('69400')),
        ]
        
        cobros_por_mes = [
            CobrosMesResponse(mes="may", monto=Decimal('188000')),
            CobrosMesResponse(mes="jun", monto=Decimal('185000')),
            CobrosMesResponse(mes="jul", monto=Decimal('71400')),
        ]
        
        # Indicadores simulados
        indicadores = IndicadoresResponse(
            ventas_mes_actual=Decimal('69400'),
            ventas_mes_anterior=Decimal('144000'),
            cobros_mes_actual=Decimal('71400'),
            cobros_mes_anterior=Decimal('185000'),
            porcentaje_variacion_ventas=-51.8,
            porcentaje_variacion_cobros=-61.4
        )
        
        situacion = SituacionGeneralResponse(
            total_vencido=resumen.total_vencido.amount,
            total_por_vencer=resumen.total_por_vencer.amount,
            total_creditos=resumen.total_creditos.amount,
            total_neto=resumen.total_neto.amount,
            cantidad_documentos_vencidos=resumen.cantidad_vencidos,
            cantidad_documentos_por_vencer=resumen.cantidad_por_vencer,
            dias_promedio_vencimiento=resumen.dias_promedio_vencimiento
        )
        
        return DashboardResponse(
            situacion=situacion,
            ventas_por_mes=ventas_por_mes,
            cobros_por_mes=cobros_por_mes,
            indicadores=indicadores
        )