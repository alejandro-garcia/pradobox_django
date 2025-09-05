from dataclasses import dataclass
from typing import Optional
from shared.domain.value_objects import ClientId, Money, Decimal


@dataclass
class Cliente:
    id: ClientId
    nombre: str
    rif: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    dias_ult_fact: Optional[int] = None
    vencido: Optional[Decimal] = Decimal(0)
    total: Optional[Decimal] = Decimal(0)
    ventas_ultimo_trimestre: Optional[Decimal] = Decimal(0)
    
    def __post_init__(self):
        if not self.nombre or len(self.nombre.strip()) == 0:
            raise ValueError("Nombre del cliente no puede estar vacío")
        
        if not self.rif or len(self.rif.strip()) == 0:
            raise ValueError("RIF del cliente no puede estar vacío")


@dataclass
class ResumenCliente:
    cliente_id: ClientId
    nombre: str
    rif: str
    total_vencido: Money
    total_por_vencer: Money
    total_creditos: Money
    total_sinvencimiento: Money
    cantidad_documentos: int
    cantidad_documentos_vencidos: int
    dias_promedio_vencimiento: int
    dias_promedio_vencimiento_todos: int 

    
    @property
    def total_neto(self) -> Money:
        return self.total_vencido + self.total_por_vencer - self.total_creditos