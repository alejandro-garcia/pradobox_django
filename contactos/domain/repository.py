from typing import List, Optional
from abc import ABC, abstractmethod

from .entities import Contact


class ContactRepository(ABC):
    @abstractmethod
    def find_by_client(self, client_id: str) -> List[Contact]:
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, contact_id: int) -> Optional[Contact]:
        raise NotImplementedError

    @abstractmethod
    def create(self, contact: Contact) -> Contact:
        raise NotImplementedError

    @abstractmethod
    def update(self, contact_id: int, data: dict) -> Contact:
        raise NotImplementedError
