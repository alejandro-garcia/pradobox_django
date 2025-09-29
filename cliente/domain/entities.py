from dataclasses import dataclass
from typing import Optional
from shared.domain.value_objects import ClientId, Decimal, MoneySigned


@dataclass
class Cliente:
    id: ClientId
    nombre: str
    rif: str
    rif2: str 
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    vendedor: Optional[str] = None
    dias_ult_fact: Optional[int] = None
    dias_promedio_emision: Optional[int] = None
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
    total_vencido: MoneySigned
    total_por_vencer: MoneySigned
    total_creditos: MoneySigned
    total_sinvencimiento: MoneySigned
    cantidad_documentos: int
    cantidad_documentos_vencidos: int
    dias_promedio_vencimiento: int
    dias_promedio_vencimiento_todos: int 

    
    @property
    def total_neto(self) -> MoneySigned:
        return self.total_vencido + self.total_por_vencer - self.total_creditos


@dataclass
class ClientFilterCriteria:
    lastYearSales: Optional[str] = None
    overdueDebt: Optional[str] = None
    totalOverdue: Optional[str] = None
    daysPastDue: Optional[str] = None
    daysSinceLastInvoice: Optional[str] = None