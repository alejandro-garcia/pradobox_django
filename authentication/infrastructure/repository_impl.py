from typing import Optional, List
from django.contrib.auth import authenticate
from django.utils import timezone
from ..domain.entities import Usuario
from ..domain.repository import UsuarioRepository
from .models import UsuarioModel


class DjangoUsuarioRepository(UsuarioRepository):
    
    def find_by_id(self, entity_id: str) -> Optional[Usuario]:
        try:
            usuario_model = UsuarioModel.objects.get(id=entity_id)
            return self._to_domain(usuario_model)
        except UsuarioModel.DoesNotExist:
            return None
    
    def find_all(self) -> List[Usuario]:
        usuario_models = UsuarioModel.objects.filter(is_active=True)
        return [self._to_domain(model) for model in usuario_models]
    
    def find_by_username(self, username: str) -> Optional[Usuario]:
        try:
            usuario_model = UsuarioModel.objects.get(username=username)
            return self._to_domain(usuario_model)
        except UsuarioModel.DoesNotExist:
            return None
    
    def find_by_email(self, email: str) -> Optional[Usuario]:
        try:
            usuario_model = UsuarioModel.objects.get(email=email)
            return self._to_domain(usuario_model)
        except UsuarioModel.DoesNotExist:
            return None
    
    def authenticate(self, username: str, password: str) -> Optional[Usuario]:
        user = authenticate(username=username, password=password)
        if user and user.is_active:
            return self._to_domain(user)
        return None
    
    def update_last_login(self, usuario_id: str) -> None:
        try:
            usuario_model = UsuarioModel.objects.get(id=usuario_id)
            usuario_model.last_login = timezone.now()
            usuario_model.save(update_fields=['last_login'])
        except UsuarioModel.DoesNotExist:
            pass
    
    def _to_domain(self, model: UsuarioModel) -> Usuario:
        return Usuario(
            id=str(model.id),
            username=model.username,
            email=model.email,
            nombre_completo=model.nombre_completo or f"{model.first_name} {model.last_name}".strip(),
            is_active=model.is_active,
            last_login=model.last_login
        )