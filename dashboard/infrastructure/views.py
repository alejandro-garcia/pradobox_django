from rest_framework.decorators import api_view
from rest_framework.response import Response
from cobranza.infrastructure.repository_impl import DjangoDocumentoRepository
from ..application.use_cases import ObtenerDashboardUseCase


@api_view(['GET'])
def dashboard_view(request):
    print('dentro de dashboard_view')
    documento_repository = DjangoDocumentoRepository()
    use_case = ObtenerDashboardUseCase(documento_repository)
    
    dashboard_data = use_case.execute(None)
    
    return Response({
        'situacion': {
            'total_vencido': float(dashboard_data.situacion.total_vencido),
            'total_por_vencer': float(dashboard_data.situacion.total_por_vencer),
            'total_creditos': float(dashboard_data.situacion.total_creditos),
            'total_neto': float(dashboard_data.situacion.total_neto),
            'cantidad_documentos_vencidos': dashboard_data.situacion.cantidad_documentos_vencidos,
            'cantidad_documentos_por_vencer': dashboard_data.situacion.cantidad_documentos_por_vencer,
            'dias_promedio_vencimiento': dashboard_data.situacion.dias_promedio_vencimiento
        },
        'ventas_por_mes': [
            {
                'mes': venta.mes,
                'monto': float(venta.monto)
            }
            for venta in dashboard_data.ventas_por_mes
        ],
        'cobros_por_mes': [
            {
                'mes': cobro.mes,
                'monto': float(cobro.monto)
            }
            for cobro in dashboard_data.cobros_por_mes
        ],
        'indicadores': {
            'ventas_mes_actual': float(dashboard_data.indicadores.ventas_mes_actual),
            'ventas_mes_anterior': float(dashboard_data.indicadores.ventas_mes_anterior),
            'cobros_mes_actual': float(dashboard_data.indicadores.cobros_mes_actual),
            'cobros_mes_anterior': float(dashboard_data.indicadores.cobros_mes_anterior),
            'porcentaje_variacion_ventas': dashboard_data.indicadores.porcentaje_variacion_ventas,
            'porcentaje_variacion_cobros': dashboard_data.indicadores.porcentaje_variacion_cobros
        }
    })