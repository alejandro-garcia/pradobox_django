from dataclasses import dataclass
from typing import List
from decimal import Decimal


@dataclass
class SituacionGeneralResponse:
    total_vencido: Decimal
    total_por_vencer: Decimal
    total_creditos: Decimal
    total_sinvencimiento: Decimal
    total_neto: Decimal
    cantidad_documentos_vencidos: int
    cantidad_documentos_total: int
    dias_promedio_vencimiento: int
    dias_promedio_vencimiento_todos: int
    dias_transcurridos: int 
    dias_faltantes: int 

@dataclass
class VentasMesResponse:
    mes: str
    monto: Decimal

@dataclass
class IndicadoresResponse:
    ventas_mes_actual: Decimal
    ventas_mes_anterior: Decimal
    porcentaje_variacion_ventas: float

@dataclass
class DashboardResponse:
    situacion: SituacionGeneralResponse
    ventas_por_mes: List[VentasMesResponse]
    indicadores: IndicadoresResponse