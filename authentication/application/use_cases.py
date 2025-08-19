from typing import Optional
from datetime import datetime, timedelta
from django.contrib.auth import authenticate
from shared.application.use_case import UseCase
from shared.domain.exceptions import ValidationException
from ..domain.entities import Usuario, SesionUsuario
from ..domain.repository import UsuarioRepository
from .dtos import LoginRequest, LoginResponse, UsuarioResponse
import jwt
from django.conf import settings


class LoginUseCase(UseCase[LoginRequest, LoginResponse]):
    
    def __init__(self, usuario_repository: UsuarioRepository):
        self.usuario_repository = usuario_repository
    
    def execute(self, request: LoginRequest) -> LoginResponse:
        if not request.username or not request.password:
            return LoginResponse(
                success=False,
                message="Username y password son requeridos"
            )
        
        # Autenticar usuario
        usuario = self.usuario_repository.authenticate(request.username, request.password)
        
        if not usuario:
            return LoginResponse(
                success=False,
                message="Credenciales inválidas"
            )
        
        if not usuario.is_active:
            return LoginResponse(
                success=False,
                message="Usuario inactivo"
            )
        
        # Generar token JWT
        token = self._generate_token(usuario)
        
        # Actualizar último login
        self.usuario_repository.update_last_login(usuario.id)
        
        return LoginResponse(
            success=True,
            token=token,
            usuario={
                'id': usuario.id,
                'username': usuario.username,
                'email': usuario.email,
                'nombre_completo': usuario.nombre_completo
            },
            message="Login exitoso"
        )
    
    def _generate_token(self, usuario: Usuario) -> str:
        payload = {
            'user_id': usuario.id,
            'username': usuario.username,
            'exp': datetime.utcnow() + timedelta(days=7),
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


class ValidateTokenUseCase(UseCase[str, Optional[UsuarioResponse]]):
    
    def __init__(self, usuario_repository: UsuarioRepository):
        self.usuario_repository = usuario_repository
    
    def execute(self, token: str) -> Optional[UsuarioResponse]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                return None
            
            usuario = self.usuario_repository.find_by_id(user_id)
            if not usuario or not usuario.is_active:
                return None
            
            return UsuarioResponse(
                id=usuario.id,
                username=usuario.username,
                email=usuario.email,
                nombre_completo=usuario.nombre_completo,
                is_active=usuario.is_active,
                last_login=usuario.last_login
            )
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None