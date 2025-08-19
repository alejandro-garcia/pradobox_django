from abc import abstractmethod
from typing import Optional
from shared.infrastructure.repository import Repository
from .entities import Usuario


class UsuarioRepository(Repository[Usuario, str]):
    
    @abstractmethod
    def find_by_username(self, username: str) -> Optional[Usuario]:
        pass
    
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[Usuario]:
        pass
    
    @abstractmethod
    def authenticate(self, username: str, password: str) -> Optional[Usuario]:
        pass
    
    @abstractmethod
    def update_last_login(self, usuario_id: str) -> None:
        pass