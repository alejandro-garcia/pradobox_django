from dataclasses import dataclass
from typing import List, Optional

from ..domain.entities import Contact, ContactPhone
from ..domain.repository import ContactRepository, ContactPhoneRepository


@dataclass
class GetContactsByClientUseCase:
    repository: ContactRepository

    def execute(self, client_id: str) -> List[Contact]:
        return self.repository.find_by_client(client_id)


@dataclass
class CreateContactUseCase:
    repository: ContactRepository

    def execute(self, contact: Contact) -> Contact:
        return self.repository.create(contact)



@dataclass
class UpdateContactUseCase:
    repository: ContactRepository

    def execute(self, contact_id: int, data: dict) -> Contact:
        return self.repository.update(contact_id, data)

@dataclass
class CreateContactPhoneUseCase:
    repository: ContactPhoneRepository

    def execute(self, contact_phone: ContactPhone) -> ContactPhone:
        return self.repository.create(contact_phone)

@dataclass
class UpdateContactPhoneUseCase:
    repository: ContactPhoneRepository

    def execute(self, phone_id: int, data: dict) -> ContactPhone:
        return self.repository.update(phone_id, data)

@dataclass
class DeleteContactPhoneUseCase:
    repository: ContactPhoneRepository

    def execute(self, phone_id: int) -> None:
        return self.repository.delete(phone_id)
