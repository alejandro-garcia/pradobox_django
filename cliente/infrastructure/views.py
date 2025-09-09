from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from shared.domain.exceptions import EntityNotFoundException
from ..application.use_cases import ( 
    ObtenerClienteUseCase, 
    ObtenerResumenClienteUseCase,
    ListarClientesUseCase,
    ListarClientesPorVendedorUseCase
)

from .repository_impl import DjangoClienteRepository

def get_cliente_repository():
    return DjangoClienteRepository()


@api_view(['GET', 'POST'])
def clientes_view(request):
    repository = get_cliente_repository()
    
    if request.method == 'GET':
        search_term = request.GET.get('search', '').strip()
        
        use_case = ListarClientesUseCase(repository)
        clientes = use_case.execute(search_term if search_term else None)
        
        return Response([{
            'id': cliente.id,
            'nombre': cliente.nombre,
            'rif': cliente.rif,
            'telefono': cliente.telefono,
            'email': cliente.email,
            'direccion': cliente.direccion,
            'dias_ult_fact': cliente.dias_ult_fact,
            'vencido': float(cliente.vencido) if cliente.vencido else 0,
            'total': float(cliente.total) if cliente.total else 0,
            'ventas_ultimo_trimestre': float(cliente.ventas_ultimo_trimestre) if cliente.ventas_ultimo_trimestre else 0
        } for cliente in clientes])
    

@api_view(['GET'])
def clients_by_seller(request, seller_id):
    repository = get_cliente_repository()

    search_term = request.GET.get('search', '').strip()
    
    use_case =  ListarClientesPorVendedorUseCase(repository)

    clientes = use_case.execute(seller_id, search_term if search_term else None)

    return Response([{
        'id': cliente.id,
        'nombre': cliente.nombre,
        'rif': cliente.rif,
        'telefono': cliente.telefono,
        'email': cliente.email,
        'direccion': cliente.direccion,
        'dias_ult_fact': cliente.dias_ult_fact,
        'vencido': float(cliente.vencido) if cliente.vencido else 0,
        'total': float(cliente.total) if cliente.total else 0,
        'ventas_ultimo_trimestre': float(cliente.ventas_ultimo_trimestre) if cliente.ventas_ultimo_trimestre else 0
    } for cliente in clientes])


@api_view(['GET'])
def cliente_detail_view(request, cliente_id):
    repository = get_cliente_repository()
    
    try:
        use_case = ObtenerClienteUseCase(repository)
        cliente = use_case.execute(cliente_id)
        
        return Response({
            'id': cliente.id,
            'nombre': cliente.nombre,
            'rif': cliente.rif or 'N/A',
            'rif2': cliente.rif2 or 'N/A',
            'telefono': cliente.telefono,
            'email': cliente.email,
            'direccion': cliente.direccion,
            'vendedor': cliente.vendedor,
            'dias_ult_fact': cliente.dias_ult_fact,
            'vencido': float(cliente.vencido) if cliente.vencido else 0,
            'total': float(cliente.total) if cliente.total else 0,
            'ventas_ultimo_trimestre': float(cliente.ventas_ultimo_trimestre) if cliente.ventas_ultimo_trimestre else 0
        })
        
    except EntityNotFoundException as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def cliente_resumen_view(request, cliente_id):
    repository = get_cliente_repository()
    
    try:
        use_case = ObtenerResumenClienteUseCase(repository)
        resumen = use_case.execute(cliente_id)
        
        return Response({
            'id': resumen.id,
            'nombre': resumen.nombre,
            'rif': resumen.rif,
            'total_vencido': float(resumen.total_vencido),
            'total_por_vencer': float(resumen.total_por_vencer),
            'total_creditos': float(resumen.total_creditos),
            'total_neto': float(resumen.total_neto),
            'total_sinvencimiento': float(resumen.total_neto),
            'cantidad_documentos': resumen.cantidad_documentos,
            'cantidad_documentos_vencidos': resumen.cantidad_documentos_vencidos, 
            'dias_promedio_vencimiento': resumen.dias_promedio_vencimiento,
            'dias_promedio_vencimiento_todos': resumen.dias_promedio_vencimiento_todos
        })
        
    except EntityNotFoundException as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)