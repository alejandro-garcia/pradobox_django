from dataclasses import dataclass
from datetime import date
from typing import Optional, List
from decimal import Decimal


@dataclass
class CrearDocumentoRequest:
    cliente_id: str
    numero: str
    tipo: str  # FACTURA, NOTA_DEBITO, CREDITO
    monto: Decimal
    fecha_emision: date
    fecha_vencimiento: date
    descripcion: Optional[str] = None


@dataclass
class DocumentoResponse:
    id: str
    cliente_id: str
    numero: str
    tipo: str
    monto: Decimal
    fecha_emision: date
    fecha_vencimiento: date
    estado: str
    dias_vencimiento: int
    esta_vencido: bool
    descripcion: Optional[str]
    cliente_nombre: Optional[str] = None
    vendedor_id: Optional[str] = None
    empresa: Optional[int] = None
    vendedor_nombre: Optional[str] = None
    productos: Optional[list] = None
    subtotal: Optional[Decimal] = None
    descuentos: Optional[Decimal] = None
    impuestos: Optional[Decimal] = None
    total: Optional[Decimal] = None
    saldo: Optional[Decimal] = None
    comentarios: Optional[str] = None
    forma_pag: Optional[str] = None


@dataclass
class ResumenCobranzasResponse:
    total_vencido: Decimal
    total_por_vencer: Decimal
    total_creditos: Decimal
    total_sinvencimiento: Decimal
    total_neto: Decimal
    cantidad_vencidos: int
    cantidad_total: int
    dias_promedio_vencimiento: int


@dataclass
class FiltroDocumentosRequest:
    cliente_id: Optional[str] = None
    estado: Optional[str] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None

@dataclass
class EventoResponse:
    id: str
    cliente_id: str
    company_id: int 
    tipo: str
    numero: str
    fecha_emision: date
    fecha_vencimiento: date
    monto: Decimal
    saldo: Decimal
    descripcion: Optional[str]
    dias_vencimiento: Optional[int] = None
