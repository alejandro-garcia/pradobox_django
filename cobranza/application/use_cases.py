from typing import List
from shared.application.use_case import UseCase
from shared.domain.value_objects import DocumentId, ClientId, Money, SellerId
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
            monto=Money(request.monto),
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
            descripcion=documento.descripcion
        )


class ObtenerResumenCobranzasUseCase(UseCase[str, ResumenCobranzasResponse]):
    
    def __init__(self, documento_repository: DocumentoRepository):
        self.documento_repository = documento_repository
    
    def execute(self, seller_id: SellerId) -> ResumenCobranzasResponse:
        resumen = self.documento_repository.get_resumen_cobranzas(seller_id)
        
        return ResumenCobranzasResponse(
            total_vencido=resumen.total_vencido.amount,
            total_por_vencer=resumen.total_por_vencer.amount,
            total_creditos=resumen.total_creditos.amount,
            total_sinvencimiento=resumen.total_sinvencimiento.amount,
            total_neto=resumen.total_neto.amount,
            cantidad_vencidos=resumen.cantidad_vencidos,
            cantidad_total=resumen.cantidad_total,
            dias_promedio_vencimiento=resumen.dias_promedio_vencimiento
        )


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
            descripcion=documento.descripcion
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
            co_ven=documento.co_ven
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
            co_ven=documento.co_ven
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