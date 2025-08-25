from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Optional
from shared.domain.value_objects import DocumentId, ClientId, Money


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
    monto: Money
    fecha_emision: date
    fecha_vencimiento: date
    estado: EstadoDocumento
    descripcion: Optional[str] = None
    co_ven: Optional[str] = None  
    
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
    total_vencido: Money
    total_por_vencer: Money
    total_creditos: Money
    cantidad_vencidos: int
    cantidad_por_vencer: int
    dias_promedio_vencimiento: int
    dias_promedio_ultima_factura: int 
    dias_transcurridos: int 
    dias_faltantes: int
    
    @property
    def total_neto(self) -> Money:
        return self.total_vencido + self.total_por_vencer + self.total_creditos