from typing import Optional
from datetime import datetime, timedelta
from django.contrib.auth import authenticate
from shared.application.use_case import UseCase
from shared.domain.exceptions import ValidationException
from ..domain.entities import Usuario, SesionUsuario
from ..domain.repository import UsuarioRepository
from .dtos import LoginRequest, LoginResponse, UsuarioResponse, ChangePasswordRequest, ChangePasswordResponse
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
                'nombre_completo': usuario.nombre_completo,
                'codigo_vendedor_profit': usuario.codigo_vendedor_profit
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
                codigo_vendedor_profit=usuario.codigo_vendedor_profit,
                is_active=usuario.is_active,
                last_login=usuario.last_login
            )
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None


class ChangePasswordUseCase(UseCase[ChangePasswordRequest, ChangePasswordResponse]):
    def __init__(self, usuario_repository: UsuarioRepository):
        self.usuario_repository = usuario_repository

    def execute(self, request: ChangePasswordRequest) -> ChangePasswordResponse:
        if not request.user_id or not request.old_password or not request.new_password:
            return ChangePasswordResponse(success=False, message="Datos incompletos")
        
        if len(request.new_password) < 8:
            return ChangePasswordResponse(success=False, message="La nueva contraseña debe tener al menos 8 caracteres")
        
        changed = self.usuario_repository.change_password(
            usuario_id=request.user_id,
            old_password=request.old_password,
            new_password=request.new_password
        )
        
        if not changed:
            return ChangePasswordResponse(success=False, message="La contraseña actual no es correcta")
        
        return ChangePasswordResponse(success=True, message="Contraseña actualizada correctamente")