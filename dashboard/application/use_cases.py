from shared.application.use_case import UseCase
from cobranza.domain.repository import DocumentoRepository
from shared.domain.value_objects import SellerId, ClientId
from .dtos import DashboardResponse, SituacionGeneralResponse, VentasMesResponse, IndicadoresResponse
from decimal import Decimal


class ObtenerDashboardUseCase(UseCase[SellerId, DashboardResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, seller_id: SellerId) -> DashboardResponse:
        # Obtener resumen de cobranzas
        
        #seller_id = SellerId(user_data.get('codigo_vendedor_profit', ''))

        resumen = self.documento_repository.get_resumen_cobranzas(seller_id)

        ventas_por_mes_dict = self.documento_repository.get_ventas_trimestre(seller_id)
        
        ventas_por_mes = [
            VentasMesResponse(mes= mes_info["mes"], monto=mes_info["amount"])
            for mes_info in ventas_por_mes_dict
        ]

        # Datos simulados para ventas y cobros por mes
        # ventas_por_mes = [
        #     VentasMesResponse(mes="may", monto=Decimal('155000')),
        #     VentasMesResponse(mes="jun", monto=Decimal('144000')),
        #     VentasMesResponse(mes="jul", monto=Decimal('69400')),
        # ]
        
        # El último es el mes actual
        venta_mes_actual = ventas_por_mes_dict[-1]["amount"]

        # El penúltimo es el mes anterior
        venta_mes_anterior = ventas_por_mes_dict[-2]["amount"]


        if venta_mes_anterior and venta_mes_anterior != 0:
            porcentaje_variacion_ventas = (
                (venta_mes_actual - venta_mes_anterior) / venta_mes_anterior
            ) * 100
        else:
            porcentaje_variacion_ventas = 0
            

        # Indicadores simulados
        indicadores = IndicadoresResponse(
            ventas_mes_actual=venta_mes_actual,
            ventas_mes_anterior=venta_mes_anterior,
            porcentaje_variacion_ventas=porcentaje_variacion_ventas
        )
        
        situacion = SituacionGeneralResponse(
            total_vencido=resumen.total_vencido.amount,
            total_por_vencer=resumen.total_por_vencer.amount,
            total_creditos=resumen.total_creditos.amount,
            total_sinvencimiento=resumen.total_sinvencimiento.amount,
            total_neto=resumen.total_neto.amount,
            cantidad_documentos_vencidos=resumen.cantidad_vencidos,
            cantidad_documentos_total=resumen.cantidad_total,
            dias_promedio_vencimiento=resumen.dias_promedio_vencimiento,
            dias_promedio_vencimiento_todos=resumen.dias_promedio_vencimiento_todos,
            dias_transcurridos=resumen.dias_transcurridos,
            dias_faltantes=resumen.dias_faltantes
        )
        
        return DashboardResponse(
            situacion=situacion,
            ventas_por_mes=ventas_por_mes,
            indicadores=indicadores
        )
    
class ObtenerDashboardClientUseCase(UseCase[ClientId, DashboardResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, client_id: ClientId) -> DashboardResponse:
        # Obtener resumen de cobranzas
        
        #seller_id = SellerId(user_data.get('codigo_vendedor_profit', ''))

        resumen = self.documento_repository.get_resumen_por_cliente(client_id)

        ventas_por_mes_dict = self.documento_repository.get_ventas_trimestre_cliente(client_id)
        
        ventas_por_mes = [
            VentasMesResponse(mes= mes_info["mes"], monto=mes_info["amount"])
            for mes_info in ventas_por_mes_dict
        ]

        # Datos simulados para ventas y cobros por mes
        # ventas_por_mes = [
        #     VentasMesResponse(mes="may", monto=Decimal('155000')),
        #     VentasMesResponse(mes="jun", monto=Decimal('144000')),
        #     VentasMesResponse(mes="jul", monto=Decimal('69400')),
        # ]
        
        # El último es el mes actual
        if len(ventas_por_mes_dict) >= 1:
            venta_mes_actual = ventas_por_mes_dict[-1]["amount"]
        else:
            venta_mes_actual = Decimal(0)

        # El penúltimo es el mes anterior
        if len(ventas_por_mes_dict) >= 2:
            venta_mes_anterior = ventas_por_mes_dict[-2]["amount"]
        else:
            venta_mes_anterior = Decimal(0)


        if venta_mes_anterior and venta_mes_anterior != 0:
            porcentaje_variacion_ventas = (
                (venta_mes_actual - venta_mes_anterior) / venta_mes_anterior
            ) * 100
        else:
            porcentaje_variacion_ventas = 0
            

        # Indicadores simulados
        indicadores = IndicadoresResponse(
            ventas_mes_actual=venta_mes_actual,
            ventas_mes_anterior=venta_mes_anterior,
            porcentaje_variacion_ventas=porcentaje_variacion_ventas
        )
        
        situacion = SituacionGeneralResponse(
            total_vencido=resumen.total_vencido.amount,
            total_por_vencer=resumen.total_por_vencer.amount,
            total_creditos=resumen.total_creditos.amount,
            total_sinvencimiento=resumen.total_sinvencimiento.amount,
            total_neto=resumen.total_neto.amount,
            cantidad_documentos_vencidos=resumen.cantidad_vencidos,
            cantidad_documentos_total=resumen.cantidad_total,
            dias_promedio_vencimiento=resumen.dias_promedio_vencimiento,
            dias_promedio_vencimiento_todos=resumen.dias_promedio_vencimiento_todos,
            dias_transcurridos=resumen.dias_transcurridos,
            dias_faltantes=resumen.dias_faltantes
        )
        
        return DashboardResponse(
            situacion=situacion,
            ventas_por_mes=ventas_por_mes,
            indicadores=indicadores
        )