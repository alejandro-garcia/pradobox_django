from abc import abstractmethod
from typing import List, Optional
from shared.infrastructure.repository import Repository
from shared.domain.value_objects import SellerId
from .entities import Vendedor


class ClienteRepository(Repository[Vendedor, SellerId]):
    
    @abstractmethod
    def search_by_name(self, nombre: str) -> List[Vendedor]:
        pass
    
    @abstractmethod
    def find_all(self, nombre: str) -> List[Vendedor]:
        pass
