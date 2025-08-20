from shared.application.use_case import UseCase
from cobranza.domain.repository import DocumentoRepository
from shared.domain.value_objects import SellerId
from .dtos import DashboardResponse, SituacionGeneralResponse, VentasMesResponse, CobrosMesResponse, IndicadoresResponse
from decimal import Decimal


class ObtenerDashboardUseCase(UseCase[SellerId, DashboardResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, seller_id: SellerId) -> DashboardResponse:
        # Obtener resumen de cobranzas
        
        #seller_id = SellerId(user_data.get('codigo_vendedor_profit', ''))

        resumen = self.documento_repository.get_resumen_cobranzas(seller_id)

        ventas_por_mes_dict = self.documento_repository.get_ventas_trimestre(seller_id)
        cobros_por_mes_dict = self.documento_repository.get_cobros_trimestre(seller_id)
     
        ventas_por_mes = [
            VentasMesResponse(mes= mes_info["mes"], monto=mes_info["amount"])
            for mes_info in ventas_por_mes_dict
        ]

        cobros_por_mes = [
            CobrosMesResponse(mes= mes_info["mes"], monto=mes_info["amount"])
            for mes_info in cobros_por_mes_dict
        ]

        # Datos simulados para ventas y cobros por mes
        # ventas_por_mes = [
        #     VentasMesResponse(mes="may", monto=Decimal('155000')),
        #     VentasMesResponse(mes="jun", monto=Decimal('144000')),
        #     VentasMesResponse(mes="jul", monto=Decimal('69400')),
        # ]
        
        # cobros_por_mes = [
        #     CobrosMesResponse(mes="may", monto=Decimal('188000')),
        #     CobrosMesResponse(mes="jun", monto=Decimal('185000')),
        #     CobrosMesResponse(mes="jul", monto=Decimal('71400')),
        # ]


        # El último es el mes actual
        venta_mes_actual = ventas_por_mes_dict[-1]["amount"]

        # El penúltimo es el mes anterior
        venta_mes_anterior = ventas_por_mes_dict[-2]["amount"]

        # El último es el mes actual
        cobros_mes_actual = cobros_por_mes_dict[-1]["amount"]

        # El penúltimo es el mes anterior
        cobros_mes_anterior = cobros_por_mes_dict[-2]["amount"]

        if venta_mes_anterior and venta_mes_anterior != 0:
            porcentaje_variacion_ventas = (
                (venta_mes_actual - venta_mes_anterior) / venta_mes_anterior
            ) * 100
        else:
            porcentaje_variacion_ventas = 0
            
        if cobros_mes_anterior and cobros_mes_anterior != 0:
            porcentaje_variacion_cobros = (
                (cobros_mes_actual - cobros_mes_anterior) / cobros_mes_anterior
            ) * 100
        else:
            porcentaje_variacion_cobros = 0

        # Indicadores simulados
        indicadores = IndicadoresResponse(
            ventas_mes_actual=venta_mes_actual,
            ventas_mes_anterior=venta_mes_anterior,
            cobros_mes_actual=cobros_mes_actual,
            cobros_mes_anterior=cobros_mes_anterior,
            porcentaje_variacion_ventas=porcentaje_variacion_ventas,
            porcentaje_variacion_cobros=porcentaje_variacion_cobros
        )
        
        situacion = SituacionGeneralResponse(
            total_vencido=resumen.total_vencido.amount,
            total_por_vencer=resumen.total_por_vencer.amount,
            total_creditos=resumen.total_creditos.amount,
            total_neto=resumen.total_neto.amount,
            cantidad_documentos_vencidos=resumen.cantidad_vencidos,
            cantidad_documentos_por_vencer=resumen.cantidad_por_vencer,
            dias_promedio_vencimiento=resumen.dias_promedio_vencimiento,
            dias_promedio_ultima_factura=resumen.dias_promedio_ultima_factura,
            dias_transcurridos=resumen.dias_transcurridos,
            dias_faltantes=resumen.dias_faltantes
        )
        
        return DashboardResponse(
            situacion=situacion,
            ventas_por_mes=ventas_por_mes,
            cobros_por_mes=cobros_por_mes,
            indicadores=indicadores
        )