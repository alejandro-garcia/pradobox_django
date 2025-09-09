from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Optional
from shared.domain.value_objects import DocumentId, ClientId, EventId, MoneySigned


class TipoDocumento(Enum):
    FACTURA = "FACT"
    NOTA_DEBITO = "N/DB"
    CREDITO = "N/CR"
    ADELANTO = "ADEL"
    AJUSTE_POSITIVO_MANUAL = "AJPM"
    AJUSTE_NEGATIVO_MANUAL = "AJNM"
    AJUSTE_POSITIVO_AUTOMATICO = "AJPA"
    AJUSTE_NEGATIVO_AUTOMATICO = "AJNA"
    CHEQUE = "CHEQ"
    GIRO = "GIRO"
    COBRO = "COB"
    DEVOLUCION = "DEV"

class EstadoDocumento(Enum):
    PENDIENTE = "PENDIENTE"
    PAGADO = "PAGADO"
    VENCIDO = "VENCIDO"
    ANULADO = "ANULADO"
    OTRO = "OTRO"


@dataclass
class Documento:
    id: DocumentId
    cliente_id: ClientId
    numero: str
    tipo: TipoDocumento
    monto: MoneySigned
    fecha_emision: date
    fecha_vencimiento: date
    estado: EstadoDocumento
    descripcion: Optional[str] = None
    vendedor_id: Optional[str] = None
    empresa: Optional[int] = None
    forma_pag: Optional[str] = None
    saldo: Optional[MoneySigned] = None
    
    @property
    def dias_vencimiento(self) -> int:
        """Calcula los días de vencimiento (positivo si está vencido)"""
        
        if type(self.fecha_vencimiento).__name__ == 'datetime':
            delta = date.today() - self.fecha_vencimiento.date()
        else:
            delta = date.today() - self.fecha_vencimiento

        return delta.days
    
    @property
    def esta_vencido(self) -> bool:
        """Indica si el documento está vencido"""
        return self.dias_vencimiento > 0 and self.estado == EstadoDocumento.PENDIENTE

@dataclass
class ResumenCobranzas:
    total_vencido: MoneySigned
    total_por_vencer: MoneySigned
    total_creditos: MoneySigned
    total_sinvencimiento: MoneySigned
    cantidad_vencidos: int
    cantidad_total: int
    dias_promedio_vencimiento: int
    dias_promedio_vencimiento_todos: int 
    dias_transcurridos: int 
    dias_faltantes: int
    
    @property
    def total_neto(self) -> MoneySigned:
        result = self.total_vencido + self.total_por_vencer + self.total_creditos - self.total_sinvencimiento
        return result
    
@dataclass
class Evento:
    id: EventId
    cliente_id: ClientId
    company_id: int
    tipo: TipoDocumento
    numero: str
    fecha_emision: date
    fecha_vencimiento: date
    monto: MoneySigned
    saldo: MoneySigned
    descripcion: Optional[str] = None
    
    @property
    def dias_vencimiento(self) -> int | None:
        """Calcula los días de vencimiento (positivo si está vencido)"""
        if self.fecha_vencimiento is None:
            return None
        
        if type(self.fecha_vencimiento).__name__ == 'datetime':
            delta = date.today() - self.fecha_vencimiento.date()
        else:
            delta = date.today() - self.fecha_vencimiento
            
        return delta.days
    
    # @property
    # def esta_vencido(self) -> bool:
    #     """Indica si el documento está vencido"""
    #     return self.dias_vencimiento > 0 and self.estado == EstadoDocumento.PENDIENTE

@dataclass
class BalanceDocument:
    tipo_doc: TipoDocumento
    numero: str
    fecha_emision: date
    fecha_vencimiento: date
    total_neto: str
    cobrado: str
    saldo: str

@dataclass
class BalanceFooter:
    descripcion: str
    amount: str

@dataclass
class Balance:
    cliente: str
    vendedor: str 
    fecha: date
    renglones: list[BalanceDocument]
    resumen: list[BalanceFooter]
