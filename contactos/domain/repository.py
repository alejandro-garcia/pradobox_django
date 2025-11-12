from typing import List, Optional
from abc import ABC, abstractmethod

from .entities import Contact, ContactAddress, ContactEmail, ContactPhone, ContactLocation


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

    @abstractmethod
    def delete(self, contact_id: int) -> None:
        raise NotImplementedError


class ContactPhoneRepository(ABC):
    @abstractmethod
    def create(self, contact_phone: dict) -> ContactPhone:
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

    @abstractmethod
    def delete_by_contact_id(self, contact_id: int) -> None:
        raise NotImplementedError

class ContactEmailRepository(ABC):
    @abstractmethod
    def create(self, contact_mail: dict) -> ContactEmail:
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

    @abstractmethod
    def delete_by_contact_id(self, contact_id: int) -> None:
        raise NotImplementedError

class ContactAddressRepository(ABC):
    @abstractmethod
    def create(self, address: ContactAddress) -> ContactAddress:
        raise NotImplementedError

    @abstractmethod
    def update(self, address_id: int, data: dict) -> ContactAddress:
        raise NotImplementedError

    @abstractmethod
    def delete(self, address_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def find_by_contact(self, contact_id: int) -> List[ContactAddress]:
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, address_id: int) -> Optional[ContactAddress]:
        raise NotImplementedError

    @abstractmethod
    def delete_by_contact_id(self, contact_id: int) -> None:
        raise NotImplementedError

class ContactPhoneProfitRepository(ABC):
    @abstractmethod
    def update(self, data: dict) -> int:
        raise NotImplementedError

class ContactEmailProfitRepository(ABC):
    @abstractmethod
    def update(self, data: dict) -> int:
        raise NotImplementedError


class ContactLocationRepository(ABC):
    @abstractmethod
    def create(self, location: dict) -> ContactLocation:
        raise NotImplementedError
    
    @abstractmethod
    def update(self, location_id: int, data: dict) -> ContactLocation:
        raise NotImplementedError
    
    @abstractmethod
    def delete(self, contact_location_id: int) -> None:
        raise NotImplementedError
    
    @abstractmethod
    def find_by_contact(self, contact_id: int) -> List[ContactLocation]:
        raise NotImplementedError

    @abstractmethod
    def delete_by_contact_id(self, contact_id: int) -> None:
        raise NotImplementedError
