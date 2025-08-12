from dataclasses import dataclass
from typing import List
from decimal import Decimal


@dataclass
class SituacionGeneralResponse:
    total_vencido: Decimal
    total_por_vencer: Decimal
    total_creditos: Decimal
    total_neto: Decimal
    cantidad_documentos_vencidos: int
    cantidad_documentos_por_vencer: int
    dias_promedio_vencimiento: int


@dataclass
class VentasMesResponse:
    mes: str
    monto: Decimal


@dataclass
class CobrosMesResponse:
    mes: str
    monto: Decimal


@dataclass
class IndicadoresResponse:
    ventas_mes_actual: Decimal
    ventas_mes_anterior: Decimal
    cobros_mes_actual: Decimal
    cobros_mes_anterior: Decimal
    porcentaje_variacion_ventas: float
    porcentaje_variacion_cobros: float


@dataclass
class DashboardResponse:
    situacion: SituacionGeneralResponse
    ventas_por_mes: List[VentasMesResponse]
    cobros_por_mes: List[CobrosMesResponse]
    indicadores: IndicadoresResponse