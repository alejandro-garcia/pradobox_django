from dataclasses import dataclass
from typing import Optional
from decimal import Decimal


@dataclass
class CrearClienteRequest:
    nombre: str
    rif: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None


@dataclass
class ClienteResponse:
    id: str
    nombre: str
    rif: str
    telefono: Optional[str]
    email: Optional[str]
    direccion: Optional[str]
    dias_ult_fact: Optional[int] = None
    vencido: Optional[Decimal] = Decimal('0')
    total: Optional[Decimal] = Decimal('0')
    ventas_ultimo_trimestre: Optional[Decimal] = Decimal('0')

@dataclass
class ResumenClienteResponse:
    id: str
    nombre: str
    rif: str
    total_vencido: Decimal
    total_por_vencer: Decimal
    total_creditos: Decimal
    total_neto: Decimal
    total_sinvencimiento: Decimal
    cantidad_documentos: int
    cantidad_documentos_vencidos: int
    dias_promedio_vencimiento: int
    dias_promedio_vencimiento_todos: int