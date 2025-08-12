from dataclasses import dataclass
from typing import List
from decimal import Decimal


@dataclass
class SituacionGeneral:
    total_vencido: Decimal
    total_por_vencer: Decimal
    total_creditos: Decimal
    total_neto: Decimal
    cantidad_documentos_vencidos: int
    cantidad_documentos_por_vencer: int
    dias_promedio_vencimiento: int


@dataclass
class VentasPorMes:
    mes: str
    monto: Decimal


@dataclass
class CobrosPorMes:
    mes: str
    monto: Decimal


@dataclass
class IndicadoresVentas:
    ventas_mes_actual: Decimal
    ventas_mes_anterior: Decimal
    cobros_mes_actual: Decimal
    cobros_mes_anterior: Decimal
    porcentaje_variacion_ventas: float
    porcentaje_variacion_cobros: float


@dataclass
class DashboardData:
    situacion: SituacionGeneral
    ventas_por_mes: List[VentasPorMes]
    cobros_por_mes: List[CobrosPorMes]
    indicadores: IndicadoresVentas