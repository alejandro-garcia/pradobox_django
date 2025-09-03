from dataclasses import dataclass
from typing import Optional
from decimal import Decimal


@dataclass
class VendedorResponse:
    id: str
    nombre: str
    cedula: str
    telefono: Optional[str]
    email: Optional[str]

@dataclass
class ResumenVendedorResponse:
    id: str
    nombre: str
    total_vencido: Decimal
    total_por_vencer: Decimal
    total_creditos: Decimal
    total_neto: Decimal
    cantidad_documentos: int
    dias_promedio_vencimiento: int