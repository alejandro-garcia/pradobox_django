from typing import List, Optional
from shared.application.use_case import UseCase
from shared.domain.value_objects import SellerId
from shared.domain.exceptions import EntityNotFoundException
from ..domain.entities import Cliente
from ..domain.repository import ClienteRepository
from .dtos import VendedorResponse

class ObtenerClienteUseCase(UseCase[str, VendedorResponse]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, seller_id: str) -> VendedorResponse:
        seller = self.cliente_repository.find_by_id(SellerId(seller_id))
        if not seller:
            raise EntityNotFoundException(f"Vendedor con ID {seller_id} no encontrado")
        
        return VendedorResponse(
            id=seller.id.value,
            nombre=seller.nombre,
            telefono=seller.telefono,
            email=seller.email,
        )

class ListarClientesUseCase(UseCase[None, List[VendedorResponse]]):
    
    def __init__(self, cliente_repository: ClienteRepository):
        self.cliente_repository = cliente_repository
    
    def execute(self, search_term: Optional[str]) -> List[VendedorResponse]:
        if search_term and len(search_term) >= 3:
            clientes = self.cliente_repository.search_by_name(search_term)
        else:
            clientes = self.cliente_repository.find_all()
        
        return [
            VendedorResponse(
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
    
