from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
from shared.domain.exceptions import EntityNotFoundException
from shared.domain.value_objects import SellerId
from ..application.use_cases import (
    CrearDocumentoUseCase,
    ObtenerDocumentosUseCase,
    ObtenerResumenCobranzasUseCase,
    ObtenerDocumentosVencidosUseCase
)
from ..application.dtos import CrearDocumentoRequest, FiltroDocumentosRequest
from .repository_impl import DjangoDocumentoRepository


def get_documento_repository():
    return DjangoDocumentoRepository()


@api_view(['GET', 'POST'])
def documentos_view(request):
    repository = get_documento_repository()
    
    if request.method == 'GET':
        filtro = FiltroDocumentosRequest(
            cliente_id=request.GET.get('cliente_id'),
            estado=request.GET.get('estado'),
            fecha_desde=datetime.strptime(request.GET.get('fecha_desde'), '%Y-%m-%d').date() if request.GET.get('fecha_desde') else None,
            fecha_hasta=datetime.strptime(request.GET.get('fecha_hasta'), '%Y-%m-%d').date() if request.GET.get('fecha_hasta') else None
        )
        
        use_case = ObtenerDocumentosUseCase(repository)
        documentos = use_case.execute(filtro)
        
        return Response([{
            'id': doc.id,
            'cliente_id': doc.cliente_id,
            'numero': doc.numero,
            'tipo': doc.tipo,
            'monto': float(doc.monto),
            'fecha_emision': doc.fecha_emision,
            'fecha_vencimiento': doc.fecha_vencimiento,
            'estado': doc.estado,
            'dias_vencimiento': doc.dias_vencimiento,
            'esta_vencido': doc.esta_vencido,
            'descripcion': doc.descripcion
        } for doc in documentos])
    
    elif request.method == 'POST':
        try:
            request_dto = CrearDocumentoRequest(
                cliente_id=request.data.get('cliente_id'),
                numero=request.data.get('numero'),
                tipo=request.data.get('tipo'),
                monto=request.data.get('monto'),
                fecha_emision=datetime.strptime(request.data.get('fecha_emision'), '%Y-%m-%d').date(),
                fecha_vencimiento=datetime.strptime(request.data.get('fecha_vencimiento'), '%Y-%m-%d').date(),
                descripcion=request.data.get('descripcion')
            )
            
            use_case = CrearDocumentoUseCase(repository)
            documento = use_case.execute(request_dto)
            
            return Response({
                'id': documento.id,
                'cliente_id': documento.cliente_id,
                'numero': documento.numero,
                'tipo': documento.tipo,
                'monto': float(documento.monto),
                'fecha_emision': documento.fecha_emision,
                'fecha_vencimiento': documento.fecha_vencimiento,
                'estado': documento.estado,
                'dias_vencimiento': documento.dias_vencimiento,
                'esta_vencido': documento.esta_vencido,
                'descripcion': documento.descripcion
            }, status=status.HTTP_201_CREATED)
            
        except (ValueError, KeyError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def resumen_cobranzas_view(request):
    repository = get_documento_repository()

    seller_id = SellerId(request.user.codigo_vendedor_profit)
    
    use_case = ObtenerResumenCobranzasUseCase(repository)
    resumen = use_case.execute(seller_id)
    
    return Response({
        'total_vencido': float(resumen.total_vencido),
        'total_por_vencer': float(resumen.total_por_vencer),
        'total_creditos': float(resumen.total_creditos),
        'total_neto': float(resumen.total_neto),
        'cantidad_vencidos': resumen.cantidad_vencidos,
        'cantidad_por_vencer': resumen.cantidad_por_vencer,
        'dias_promedio_vencimiento': resumen.dias_promedio_vencimiento
    })


@api_view(['GET'])
def documentos_vencidos_view(request):
    repository = get_documento_repository()
    
    use_case = ObtenerDocumentosVencidosUseCase(repository)
    documentos = use_case.execute(None)
    
    return Response([{
        'id': doc.id,
        'cliente_id': doc.cliente_id,
        'numero': doc.numero,
        'tipo': doc.tipo,
        'monto': float(doc.monto),
        'fecha_emision': doc.fecha_emision,
        'fecha_vencimiento': doc.fecha_vencimiento,
        'estado': doc.estado,
        'dias_vencimiento': doc.dias_vencimiento,
        'esta_vencido': doc.esta_vencido,
        'descripcion': doc.descripcion
    } for doc in documentos])