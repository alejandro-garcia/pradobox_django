from dataclasses import dataclass
from typing import List, Optional

from ..domain.entities import Contact
from ..domain.repository import ContactRepository


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
