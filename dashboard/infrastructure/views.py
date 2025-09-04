from rest_framework.decorators import api_view
from rest_framework.response import Response
from cobranza.infrastructure.repository_impl import DjangoDocumentoRepository
from shared.domain.value_objects import SellerId
from ..application.use_cases import ObtenerDashboardUseCase


def get_dashboard(seller_id: SellerId):
    documento_repository = DjangoDocumentoRepository()
    use_case = ObtenerDashboardUseCase(documento_repository)
       
    dashboard_data = use_case.execute(seller_id)

   
    return Response({
        'situacion': {
            'total_vencido': float(dashboard_data.situacion.total_vencido),
            'total_por_vencer': float(dashboard_data.situacion.total_por_vencer),
            'total_creditos': float(dashboard_data.situacion.total_creditos),
            'total_sinvencimiento': float(dashboard_data.situacion.total_sinvencimiento),
            'total_neto': float(dashboard_data.situacion.total_neto),
            'cantidad_documentos_vencidos': dashboard_data.situacion.cantidad_documentos_vencidos,
            'cantidad_documentos_total': dashboard_data.situacion.cantidad_documentos_total,
            'dias_promedio_vencimiento': dashboard_data.situacion.dias_promedio_vencimiento,
            'dias_promedio_vencimiento_todos': dashboard_data.situacion.dias_promedio_vencimiento_todos,
            'dias_transcurridos': dashboard_data.situacion.dias_transcurridos, 
            'dias_faltantes': dashboard_data.situacion.dias_faltantes
        },
        'ventas_por_mes': [
            {
                'mes': venta.mes,
                'monto': float(venta.monto)
            }
            for venta in dashboard_data.ventas_por_mes
        ],
        'indicadores': {
            'ventas_mes_actual': float(dashboard_data.indicadores.ventas_mes_actual),
            'ventas_mes_anterior': float(dashboard_data.indicadores.ventas_mes_anterior),
            'porcentaje_variacion_ventas': dashboard_data.indicadores.porcentaje_variacion_ventas
        }
    })    


@api_view(['GET'])
def dashboard_view(request):
    print('dentro de dashboard_view')

    if type(request.user).__name__ != "AnonymousUser":
        seller_id = SellerId(request.user.codigo_vendedor_profit if request.user.codigo_vendedor_profit else '-1')
    else:
        seller_id = SellerId("-1")

    return get_dashboard(seller_id)        

@api_view(['GET'])
def dashboard_seller_view(request, seller_id):
    print('dentro de dashboard_view')
    seller = SellerId(seller_id)
   
    return get_dashboard(seller)


    