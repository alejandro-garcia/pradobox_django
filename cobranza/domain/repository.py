from abc import abstractmethod
from typing import List, Optional
from datetime import date
from shared.infrastructure.repository import Repository
from shared.domain.value_objects import DocumentId, ClientId
from .entities import Documento, ResumenCobranzas, EstadoDocumento


class DocumentoRepository(Repository[Documento, DocumentId]):
    
    @abstractmethod
    def find_by_cliente(self, cliente_id: ClientId) -> List[Documento]:
        pass
    
    @abstractmethod
    def find_vencidos(self) -> List[Documento]:
        pass
    
    @abstractmethod
    def find_by_fecha_vencimiento(self, fecha_desde: date, fecha_hasta: date) -> List[Documento]:
        pass
    
    @abstractmethod
    def find_by_estado(self, estado: EstadoDocumento) -> List[Documento]:
        pass
    
    @abstractmethod
    def get_resumen_cobranzas(self) -> ResumenCobranzas:
        pass
    
    @abstractmethod
    def get_resumen_por_cliente(self, cliente_id: ClientId) -> ResumenCobranzas:
        pass