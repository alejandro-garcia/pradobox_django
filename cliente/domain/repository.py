from abc import abstractmethod
from typing import List, Optional
from shared.infrastructure.repository import Repository
from shared.domain.value_objects import ClientId
from .entities import Cliente, ResumenCliente


class ClienteRepository(Repository[Cliente, ClientId]):
    
    @abstractmethod
    def find_by_rif(self, rif: str) -> Optional[Cliente]:
        pass
    
    @abstractmethod
    def search_by_name(self, nombre: str) -> List[Cliente]:
        pass
    
    @abstractmethod
    def get_resumen_cliente(self, cliente_id: ClientId) -> Optional[ResumenCliente]:
        pass