from dataclasses import dataclass
from typing import Optional
from shared.domain.value_objects import SellerId


@dataclass
class Vendedor:
    id: SellerId
    nombre: str
    cedula: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    
    def __post_init__(self):
        if not self.nombre or len(self.nombre.strip()) == 0:
            raise ValueError("Nombre del Vendedor no puede estar vacío")
