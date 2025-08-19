from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class LoginRequest:
    username: str
    password: str


@dataclass
class LoginResponse:
    success: bool
    token: Optional[str] = None
    usuario: Optional[dict] = None
    message: Optional[str] = None


@dataclass
class UsuarioResponse:
    id: str
    username: str
    email: str
    nombre_completo: str
    is_active: bool
    last_login: Optional[datetime]