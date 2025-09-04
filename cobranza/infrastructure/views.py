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
    ObtenerDocumentosVencidosUseCase,
    VerDocumentosPendientesUseCase,
    VerDocumentosPendientesClienteUseCase,
    EventosClienteUseCase,
    VerDetalleDocumentoClienteUseCase,
    CreateDocumentPdfUseCase,
    CreateBalancePdfUseCase
)
from ..application.dtos import CrearDocumentoRequest, FiltroDocumentosRequest
from .repository_impl import DjangoDocumentoRepository, DjangoEventoRepository
from django.http import HttpResponse


def get_documento_repository():
    return DjangoDocumentoRepository()

def get_evento_repository():
    return DjangoEventoRepository()


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
        'total_sinvencimiento': float(resumen.total_sinvencimiento),
        'total_neto': float(resumen.total_neto),
        'cantidad_vencidos': resumen.cantidad_vencidos,
        'cantidad_total': resumen.cantidad_total,
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


@api_view(['GET'])
def documentos_pendientes_view(request, seller_id):
    repository = get_documento_repository()
    
    #seller_id = request.user.codigo_vendedor_profit if hasattr(request.user, 'codigo_vendedor_profit') else "-1"
    
    use_case = VerDocumentosPendientesUseCase(repository)
    documentos = use_case.execute(seller_id or "-1")
    
    return Response([{
        'id': doc.id,
        'cliente_id': doc.cliente_id,
        'cliente_nombre': doc.cliente_nombre,
        'numero': doc.numero,
        'tipo': doc.tipo,
        'monto': float(doc.monto),
        'fecha_emision': doc.fecha_emision,
        'fecha_vencimiento': doc.fecha_vencimiento,
        'estado': doc.estado,
        'dias_vencimiento': doc.dias_vencimiento,
        'esta_vencido': doc.esta_vencido,
        'descripcion': doc.descripcion,
        'vendedor_id': doc.vendedor_id,
        'empresa': doc.empresa
    } for doc in documentos])

@api_view(['GET'])
def documentos_pendientes_cliente_view(request, client_id):
    repository = get_documento_repository()
    
    use_case = VerDocumentosPendientesClienteUseCase(repository)
    documentos = use_case.execute(client_id)
    
    return Response([{
        'id': doc.id,
        'cliente_id': doc.cliente_id,
        'cliente_nombre': doc.cliente_nombre,
        'numero': doc.numero,
        'tipo': doc.tipo,
        'monto': float(doc.monto),
        'fecha_emision': doc.fecha_emision,
        'fecha_vencimiento': doc.fecha_vencimiento,
        'estado': doc.estado,
        'dias_vencimiento': doc.dias_vencimiento,
        'esta_vencido': doc.esta_vencido,
        'descripcion': doc.descripcion,
        'vendedor_id': doc.vendedor_id,
        'empresa': doc.empresa
    } for doc in documentos])

@api_view(['GET'])
def documento_detalle_view(request, documento_id):
    repository = get_documento_repository()
    
    try:
        use_case = VerDetalleDocumentoClienteUseCase(repository)
        documento = use_case.execute(documento_id)
        
        return Response({
            'id': documento.id,
            'cliente_id': documento.cliente_id,
            'cliente_nombre': documento.cliente_nombre,
            'numero': documento.numero,
            'tipo': documento.tipo,
            'monto': float(documento.monto),
            'fecha_emision': documento.fecha_emision,
            'fecha_vencimiento': documento.fecha_vencimiento,
            'estado': documento.estado,
            'dias_vencimiento': documento.dias_vencimiento,
            'esta_vencido': documento.esta_vencido,
            'descripcion': documento.descripcion,
            'vendedor_id': documento.vendedor_id,
            'vendedor_nombre': documento.vendedor_nombre,
            'productos': documento.productos,
            'subtotal': float(documento.subtotal) if documento.subtotal else 0,
            'descuentos': float(documento.descuentos) if documento.descuentos else 0,
            'impuestos': float(documento.impuestos) if documento.impuestos else 0,
            'total': float(documento.total) if documento.total else 0,
            'saldo': float(documento.saldo) if documento.saldo else 0,
            'comentarios': documento.comentarios, 
            'empresa': documento.empresa
        })
        
    except EntityNotFoundException as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def eventos_cliente_view(request, client_id):
    repository = get_evento_repository()
    
    use_case = EventosClienteUseCase(repository)

    documentos = use_case.execute(client_id)
   
    return Response([{
        'id': doc.id,
        'cliente_id': doc.cliente_id,
        'company_id': doc.company_id,
        'tipo': doc.tipo,
        'numero': doc.numero,
        'fecha_emision': doc.fecha_emision,
        'fecha_vencimiento': doc.fecha_vencimiento,
        'monto': float(doc.monto),
        'saldo': float(doc.saldo) if doc.saldo else 0,
        'descripcion': doc.descripcion, 
        'dias_vencimiento': doc.dias_vencimiento
    } for doc in documentos])


@api_view(['GET'])
def documento_pdf_view(request, documento_id):
    repository = get_documento_repository()
    try:
        use_case = CreateDocumentPdfUseCase(repository)
        pdf_bytes = use_case.execute(documento_id)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="documento_{documento_id}.pdf"'
        return response
    except EntityNotFoundException as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
    
@api_view(['GET'])
def balance_pdf_view(request, rif):
    repository = get_documento_repository()
    try:
        use_case = CreateBalancePdfUseCase(repository)
        pdf_bytes = use_case.execute(rif)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="documento_{rif}.pdf"'
        return response
    except EntityNotFoundException as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)