from typing import List, Optional
from shared.application.use_case import UseCase
from shared.domain.value_objects import ClientId, SellerId
from shared.domain.exceptions import EntityNotFoundException
from ..domain.entities import Cliente
from ..domain.repository import ClienteRepository
from .dtos import CrearClienteRequest, ClienteResponse, ResumenClienteResponse


class CrearClienteUseCase(UseCase[CrearClienteRequest, ClienteResponse]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, request: CrearClienteRequest) -> ClienteResponse:
        # Verificar que no existe un cliente con el mismo RIF
        existing_cliente = self.cliente_repository.find_by_rif(request.rif)
        if existing_cliente:
            raise ValueError(f"Ya existe un cliente con RIF {request.rif}")
        
        # Crear nuevo cliente
        cliente_id = ClientId(f"CLI_{request.rif}")
        cliente = Cliente(
            id=cliente_id,
            nombre=request.nombre,
            rif=request.rif,
            telefono=request.telefono,
            email=request.email,
            direccion=request.direccion
        )
        
        saved_cliente = self.cliente_repository.save(cliente)
        
        return ClienteResponse(
            id=saved_cliente.id.value,
            nombre=saved_cliente.nombre,
            rif=saved_cliente.rif,
            telefono=saved_cliente.telefono,
            email=saved_cliente.email,
            direccion=saved_cliente.direccion
        )


class ObtenerClienteUseCase(UseCase[str, ClienteResponse]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, cliente_id: str) -> ClienteResponse:
        cliente = self.cliente_repository.find_by_id(ClientId(cliente_id))
        if not cliente:
            raise EntityNotFoundException(f"Cliente con ID {cliente_id} no encontrado")
        
        return ClienteResponse(
            id=cliente.id.value,
            nombre=cliente.nombre,
            rif=cliente.rif,
            telefono=cliente.telefono,
            email=cliente.email,
            direccion=cliente.direccion,
            dias_ult_fact=cliente.dias_ult_fact,
            vencido=cliente.vencido,
            total=cliente.total,  
            ventas_ultimo_trimestre=cliente.ventas_ultimo_trimestre
        )


class ObtenerResumenClienteUseCase(UseCase[str, ResumenClienteResponse]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, cliente_id: str) -> ResumenClienteResponse:
        resumen = self.cliente_repository.get_resumen_cliente(ClientId(cliente_id))
        if not resumen:
            raise EntityNotFoundException(f"Resumen del cliente {cliente_id} no encontrado")
        
        return ResumenClienteResponse(
            id=resumen.cliente_id.value,
            nombre=resumen.nombre,
            rif=resumen.rif,
            total_vencido=resumen.total_vencido.amount,
            total_por_vencer=resumen.total_por_vencer.amount,
            total_creditos=resumen.total_creditos.amount,
            total_neto=resumen.total_neto.amount,
            cantidad_documentos=resumen.cantidad_documentos,
            dias_promedio_vencimiento=resumen.dias_promedio_vencimiento
        )


class ListarClientesUseCase(UseCase[None, List[ClienteResponse]]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, search_term: Optional[str]) -> List[ClienteResponse]:
        if search_term and len(search_term) >= 3:
            clientes = self.cliente_repository.search_by_name(search_term)
        else:
            clientes = self.cliente_repository.find_all()
        
        return [
            ClienteResponse(
                id=cliente.id.value,
                nombre=cliente.nombre,
                rif=cliente.rif,
                telefono=cliente.telefono,
                email=cliente.email,
                direccion=cliente.direccion,
                dias_ult_fact=cliente.dias_ult_fact,
                vencido=cliente.vencido,
                total=cliente.total,
                ventas_ultimo_trimestre=cliente.ventas_ultimo_trimestre
            )
            for cliente in clientes
            if cliente.total > 0 or len(search_term or '') >= 3
        ]
    
class ListarClientesPorVendedorUseCase(UseCase[List[str], List[ClienteResponse]]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, seller_id: str, search_term: Optional[str]) -> List[ClienteResponse]:
        clientes = self.cliente_repository.search_by_name_and_seller(search_term, SellerId(seller_id))
        
        return [
            ClienteResponse(
                id=cliente.id.value,
                nombre=cliente.nombre,
                rif=cliente.rif,
                telefono=cliente.telefono,
                email=cliente.email,
                direccion=cliente.direccion,
                dias_ult_fact=cliente.dias_ult_fact,
                vencido=cliente.vencido,
                total=cliente.total,
                ventas_ultimo_trimestre=cliente.ventas_ultimo_trimestre
            )
            for cliente in clientes
        ]