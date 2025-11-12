from typing import List
from django.template.loader import render_to_string
import pdfkit

from shared.application.use_case import UseCase
from shared.domain.value_objects import DocumentId, ClientId, MoneySigned, SellerId
from shared.domain.exceptions import EntityNotFoundException
from ..domain.entities import Documento, TipoDocumento, EstadoDocumento, Evento
from ..domain.repository import DocumentoRepository, EventoRepository
from .dtos import (
    CrearDocumentoRequest, 
    DocumentoResponse, 
    ResumenCobranzasResponse,
    FiltroDocumentosRequest,
    EventoResponse
)


class CrearDocumentoUseCase(UseCase[CrearDocumentoRequest, DocumentoResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, request: CrearDocumentoRequest) -> DocumentoResponse:
        documento_id = DocumentId(f"DOC_{request.numero}")
        
        documento = Documento(
            id=documento_id,
            cliente_id=ClientId(request.cliente_id),
            numero=request.numero,
            tipo=TipoDocumento(request.tipo),
            monto=MoneySigned(request.monto),
            fecha_emision=request.fecha_emision,
            fecha_vencimiento=request.fecha_vencimiento,
            estado=EstadoDocumento.PENDIENTE,
            descripcion=request.descripcion
        )
        
        saved_documento = self.documento_repository.save(documento)
        
        return self._to_response(saved_documento)


class ObtenerDocumentosUseCase(UseCase[FiltroDocumentosRequest, List[DocumentoResponse]]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, request: FiltroDocumentosRequest) -> List[DocumentoResponse]:
        if request.cliente_id:
            documentos = self.documento_repository.find_by_cliente(ClientId(request.cliente_id))
        elif request.estado:
            documentos = self.documento_repository.find_by_estado(EstadoDocumento(request.estado))
        elif request.fecha_desde and request.fecha_hasta:
            documentos = self.documento_repository.find_by_fecha_vencimiento(
                request.fecha_desde, request.fecha_hasta
            )
        else:
            documentos = self.documento_repository.find_all()
        
        return [self._to_response(doc) for doc in documentos]
    
    def _to_response(self, documento: Documento) -> DocumentoResponse:
        return DocumentoResponse(
            id=documento.id.value,
            cliente_id=documento.cliente_id.value,
            numero=documento.numero,
            tipo=documento.tipo.value,
            monto=documento.monto.amount,
            fecha_emision=documento.fecha_emision,
            fecha_vencimiento=documento.fecha_vencimiento,
            estado=documento.estado.value,
            dias_vencimiento=documento.dias_vencimiento,
            esta_vencido=documento.esta_vencido,
            descripcion=documento.descripcion,
            empresa=documento.empresa
        )


# class ObtenerResumenCobranzasUseCase(UseCase[str, ResumenCobranzasResponse]):
    
#     def __init__(self, documento_repository: DocumentoRepository):
#         self.documento_repository = documento_repository
    
#     def execute(self, seller_id: SellerId) -> ResumenCobranzasResponse:
#         resumen = self.documento_repository.get_resumen_cobranzas(seller_id)
        
#         return ResumenCobranzasResponse(
#             total_vencido=resumen.total_vencido.amount,
#             total_por_vencer=resumen.total_por_vencer.amount,
#             total_creditos=resumen.total_creditos.amount,
#             total_sinvencimiento=resumen.total_sinvencimiento.amount,
#             total_neto=resumen.total_neto.amount,
#             cantidad_vencidos=resumen.cantidad_vencidos,
#             cantidad_total=resumen.cantidad_total,
#             dias_promedio_vencimiento=resumen.dias_promedio_vencimiento
#         )


class ObtenerDocumentosVencidosUseCase(UseCase[None, List[DocumentoResponse]]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, _: None) -> List[DocumentoResponse]:
        documentos_vencidos = self.documento_repository.find_vencidos()
        
        return [self._to_response(doc) for doc in documentos_vencidos]
    
    def _to_response(self, documento: Documento) -> DocumentoResponse:
        return DocumentoResponse(
            id=documento.id.value,
            cliente_id=documento.cliente_id.value,
            numero=documento.numero,
            tipo=documento.tipo.value,
            monto=documento.monto.amount,
            fecha_emision=documento.fecha_emision,
            fecha_vencimiento=documento.fecha_vencimiento,
            estado=documento.estado.value,
            dias_vencimiento=documento.dias_vencimiento,
            esta_vencido=documento.esta_vencido,
            descripcion=documento.descripcion,
            empresa=documento.empresa
        )


class VerDocumentosPendientesUseCase(UseCase[str, List[DocumentoResponse]]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, seller_id: str) -> List[DocumentoResponse]:
        # Obtener todos los documentos pendientes (vencidos y por vencer)
        documentos_pendientes = self.documento_repository.find_documentos_pendientes(seller_id)
        
        return [self._to_response(doc) for doc in documentos_pendientes]
    
    def _to_response(self, documento: Documento) -> DocumentoResponse:
        return DocumentoResponse(
            id=documento.id.value,
            cliente_id=documento.cliente_id.value,
            numero=documento.numero,
            tipo=documento.tipo.value,
            monto=documento.monto.amount,
            fecha_emision=documento.fecha_emision,
            fecha_vencimiento=documento.fecha_vencimiento,
            estado=documento.estado.value,
            dias_vencimiento=documento.dias_vencimiento,
            esta_vencido=documento.esta_vencido,
            descripcion=documento.descripcion,
            cliente_nombre=getattr(documento, 'cliente_nombre', ''),
            vendedor_id=documento.vendedor_id.value,
            empresa=documento.empresa, 
            saldo=documento.saldo.amount
        )


class VerDocumentosPendientesClienteUseCase(UseCase[str, List[DocumentoResponse]]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, client_id: str) -> List[DocumentoResponse]:
        # Obtener todos los documentos pendientes (vencidos y por vencer)
        documentos_pendientes = self.documento_repository.find_documentos_pendientes_cliente(client_id)
        
        return [self._to_response(doc) for doc in documentos_pendientes]
    
    def _to_response(self, documento: Documento) -> DocumentoResponse:
        return DocumentoResponse(
            id=documento.id.value,
            cliente_id=documento.cliente_id.value,
            numero=documento.numero,
            tipo=documento.tipo.value,
            monto=documento.monto.amount,
            fecha_emision=documento.fecha_emision,
            fecha_vencimiento=documento.fecha_vencimiento,
            estado=documento.estado.value,
            dias_vencimiento=documento.dias_vencimiento,
            esta_vencido=documento.esta_vencido,
            descripcion=documento.descripcion,
            cliente_nombre=getattr(documento, 'cliente_nombre', ''),
            vendedor_id=documento.vendedor_id.value,
            empresa=documento.empresa,
            saldo=documento.saldo.amount
        )


class EventosClienteUseCase(UseCase[str, List[EventoResponse]]):
    
    def __init__(self, evento_repository: EventoRepository):
        self.evento_repository = evento_repository
    
    def execute(self, client_id: str) -> List[EventoResponse]:
        # Obtener todos los documentos pendientes (vencidos y por vencer)
        documentos_pendientes = self.evento_repository.find_eventos_cliente(client_id)
        
        return [self._to_response(doc) for doc in documentos_pendientes]
       
    def _to_response(self, evento: Evento) -> EventoResponse:
        return EventoResponse(
            id=evento.id.value,
            cliente_id=evento.cliente_id.value,
            company_id=evento.company_id,
            tipo=evento.tipo.value,
            numero=evento.numero,
            fecha_emision=evento.fecha_emision,
            fecha_vencimiento=evento.fecha_vencimiento,
            monto=evento.monto.amount,
            saldo=evento.saldo.amount,
            descripcion=evento.descripcion,
            dias_vencimiento=evento.dias_vencimiento
        )


class VerDetalleDocumentoClienteUseCase(UseCase[str, DocumentoResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, documento_id: str) -> DocumentoResponse:
        documento = self.documento_repository.get_detalle_documento(documento_id)
        if not documento:
            raise EntityNotFoundException(f"Documento con ID {documento_id} no encontrado")
        
        return self._to_response(documento)
    
    def _to_response(self, documento: Documento) -> DocumentoResponse:
        return DocumentoResponse(
            id=documento.id.value,
            cliente_id=documento.cliente_id.value,
            numero=documento.numero,
            tipo=documento.tipo.value,
            monto=documento.monto.amount,
            fecha_emision=documento.fecha_emision,
            fecha_vencimiento=documento.fecha_vencimiento,
            estado=documento.estado.value,
            dias_vencimiento=documento.dias_vencimiento if documento.fecha_vencimiento else None,
            esta_vencido=documento.esta_vencido if documento.fecha_vencimiento else False,
            descripcion=documento.descripcion,
            cliente_nombre=getattr(documento, 'cliente_nombre', ''),
            vendedor_id=documento.vendedor_id.value,
            vendedor_nombre=getattr(documento, 'vendedor_nombre', ''),
            productos=getattr(documento, 'productos', []),
            subtotal=getattr(documento, 'subtotal', documento.monto.amount),
            descuentos=getattr(documento, 'descuentos', 0),
            impuestos=getattr(documento, 'impuestos', 0),
            total=getattr(documento, 'total', documento.monto.amount),
            saldo=getattr(documento, 'saldo', documento.monto.amount),
            comentarios=getattr(documento, 'comentarios', ''),
            empresa=documento.empresa
        )


class CreateDocumentPdfUseCase(UseCase[str, bytes]):
    """Genera un PDF de una factura/documento usando la plantilla invoices.html"""

    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository

    def execute(self, documento_id: str) -> bytes:
        documento = self.documento_repository.get_detalle_documento(documento_id)
        if not documento:
            raise EntityNotFoundException(f"Documento con ID {documento_id} no encontrado")

        # Adaptar datos al contexto esperado por templates/invoices.html
        productos = getattr(documento, 'productos', []) or []

        renglones = []
        for idx, prod in enumerate(productos, start=1):
            renglones.append({
                'reng_num': idx,
                'art_des': prod.get('descripcion') or prod.get('art_des', ''),
                'cantidad': prod.get('cantidad', 0),
                'uni_venta': prod.get('unidad'),
                'precioUnit': prod.get('precio_unitario') or prod.get('precio', 0),
                'subtotal': prod.get('subtotal', 0),
                'tipoImpuesto': prod.get('tipo_impuesto', '')
            })

        factura_ctx = {
            'factura': documento.numero,
            'cliente': getattr(documento, 'cliente_nombre', ''),
            'rif': getattr(documento, 'cliente_rif', ''),
            'vendedor': getattr(documento, 'vendedor_nombre', ''),
            'condicion_pago': getattr(documento, 'condicion_pago', ''),
            'moneda': 'USD',
            'saldo': float(getattr(documento, 'saldo', documento.monto.amount) or 0),
            'fechaEmision': documento.fecha_emision.strftime('%d/%m/%Y'),
            'fechaVencimiento': documento.fecha_vencimiento.strftime('%d/%m/%Y'),
            'renglones': renglones,
            'tot_bruto': float(getattr(documento, 'subtotal', documento.monto.amount) or 0),
            'iva': float(getattr(documento, 'impuestos', 0) or 0),
            'tot_neto': float(getattr(documento, 'total', documento.monto.amount) or 0)
        }

        context = {
            'facturas': [factura_ctx]
        }

        html = render_to_string('invoices.html', context)

        # Opciones básicas para wkhtmltopdf/pdfkit
        options = {
            'page-size': 'Letter',
            'margin-top': '0.01in',
            'margin-right': '0.01in',
            'margin-bottom':'0.01in',
            'margin-left':'0.01in',
            'encoding': 'UTF-8',
            'enable-local-file-access': None,
            'quiet': ''
        }

        pdf_bytes = pdfkit.from_string(html, False, options=options)
        return pdf_bytes
    
class CreateBalancePdfUseCase(UseCase[str, bytes]):
    """Genera un PDF de un balance usando la plantilla balance.html"""

    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository

    def execute(self, rif: str) -> bytes:
        estado_cuenta = self.documento_repository.get_estado_cuenta(rif)
        if not estado_cuenta:
            raise EntityNotFoundException(f"Estado de cuenta para cliente/rif {rif} no encontrado")
        elif len(estado_cuenta.renglones) == 0:
            raise EntityNotFoundException(f"El cliente/rif {rif} no tiene deudas")
            
        """
            tipo=tipo,
            numero=nro_doc,
            fecha_emision=fec_emis,
            fecha_vencimiento=fec_venc,
            total_neto=MoneySigned(total_neto),
            cobrado=MoneySigned(cobrado),
            saldo=MoneySigned(saldo)

                            <td>{{ doc.tipo_doc }}</td>
                        <td>{{ doc.nro_doc }}</td>
                        <td>{{ doc.fec_emis.strftime('%d/%m/%Y') }}</td>
                        <td>{{ doc.fec_vcto.strftime('%d/%m/%Y') }}</td>
                        <td>{{ doc.dias_vcto }}</td>
                        <td class="align-right">{{ doc.tot_neto }}</td>
                        <td class="align-right">{{ doc.cobrado }}</td>
                        <td class="align-right {% if doc.dias_vcto > 0 %} negativo {% endif %}">{{ doc.saldo }}</td>
        """

        context = {
            'cliente': estado_cuenta.cliente,
            'vendedor': estado_cuenta.vendedor,
            'fecha': estado_cuenta.fecha.strftime('%d/%m/%Y'),
            'documentos': [
                {
                    'tipo_doc': doc.tipo_doc,
                    'nro_doc': doc.numero,
                    'fec_emis': doc.fecha_emision.strftime('%d/%m/%Y'),
                    'fec_vcto': doc.fecha_vencimiento.strftime('%d/%m/%Y'),
                    'tot_neto': doc.total_neto,
                    'cobrado': doc.cobrado,
                    'saldo': doc.saldo
                } for doc in estado_cuenta.renglones
            ],
            'estado_deudor': [
                {
                'esta': edocta.descripcion,
                'saldo': edocta.amount
             
            } for edocta in estado_cuenta.resumen ],
            'cobrador': estado_cuenta.vendedor
        }

        html = render_to_string('balance.html', context)

        # Opciones básicas para wkhtmltopdf/pdfkit
        options = {
            'encoding': 'UTF-8',
            'enable-local-file-access': None,
            'quiet': ''
        }

        pdf_bytes = pdfkit.from_string(html, False, options=options)
        return pdf_bytes

class CreateSellerBalancePdfUseCase(UseCase[str, bytes]):
    """Genera un PDF de un balance usando la plantilla balance.html"""

    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository

    def execute(self, seller_ids: str) -> bytes:
        estado_cuenta = self.documento_repository.get_estado_cuenta_vendedor(seller_ids)
        if not estado_cuenta:
            raise EntityNotFoundException(f"Estado de cuenta para vendedores {seller_ids} no encontrado")
        
        context = {
            'vendedor': estado_cuenta.vendedor,
            'fecha': estado_cuenta.fecha.strftime('%d/%m/%Y'),
            'documentos': [
                {
                    'rif': doc.rif,
                    'cliente': doc.cliente,
                    'tipo_doc': doc.tipo_doc,
                    'nro_doc': doc.numero,
                    'fec_emis': doc.fecha_emision.strftime('%d/%m/%Y') if doc.fecha_emision else '',
                    'fec_vcto': doc.fecha_vencimiento.strftime('%d/%m/%Y') if doc.fecha_vencimiento else '',
                    'dias_vcto': doc.dias_vcto,
                    'tot_neto': doc.total_neto,
                    'saldo': doc.saldo,
                    'flag': doc.orden
                } for doc in estado_cuenta.renglones
            ],
            'estado_deudor': [
                {
                'esta': edocta.descripcion,
                'saldo': edocta.amount
             
            } for edocta in estado_cuenta.resumen ],
            'cobrador': estado_cuenta.vendedor
        }

        html = render_to_string('seller_balance.html', context)

        # Opciones básicas para wkhtmltopdf/pdfkit
        options = {
            'page-size': 'Letter',
            'margin-top': '0.01in',
            'margin-right': '0.01in',
            'margin-bottom':'0.01in',
            'margin-left':'0.01in',
            'encoding': 'UTF-8',
            'enable-local-file-access': None,
            'quiet': ''
        }

        pdf_bytes = pdfkit.from_string(html, False, options=options)
        return pdf_bytes