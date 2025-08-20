from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class Usuario:
    id: str
    username: str
    email: str
    nombre_completo: str
    codigo_vendedor_profit: str
    is_active: bool = True
    last_login: Optional[datetime] = None
    
    def __post_init__(self):
        if not self.username or len(self.username.strip()) == 0:
            raise ValueError("Username no puede estar vacío")
        
        if not self.email or len(self.email.strip()) == 0:
            raise ValueError("Email no puede estar vacío")


@dataclass
class SesionUsuario:
    usuario: Usuario
    token: str
    expires_at: datetime
    
    @property
    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at