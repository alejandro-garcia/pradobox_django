from typing import List, Optional
from abc import ABC, abstractmethod

from .entities import Contact, ContactEmail, ContactPhone


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


class ContactPhoneRepository(ABC):
    @abstractmethod
    def create(self, contact_phone: ContactPhone) -> ContactPhone:
        raise NotImplementedError

    @abstractmethod
    def update(self, contact_phone_id: int, data: dict) -> ContactPhone:
        raise NotImplementedError

    @abstractmethod
    def delete(self, contact_phone_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def find_by_contact(self, contact_id: int) -> List[ContactPhone]:
        raise NotImplementedError

class ContactEmailRepository(ABC):
    @abstractmethod
    def create(self, contact_mail: ContactEmail) -> ContactEmail:
        raise NotImplementedError
    
    @abstractmethod
    def update(self, contact_mail_id: int, data: dict) -> ContactEmail:
        raise NotImplementedError
    
    @abstractmethod
    def delete(self, contact_mail_id: int) -> None:
        raise NotImplementedError
    
    @abstractmethod
    def find_by_contact(self, contact_id: int) -> List[ContactEmail]:
        raise NotImplementedError

