from dataclasses import dataclass
from typing import List, Optional

from ..domain.entities import Contact, ContactPhone, ContactEmail, ContactAddress, ContactLocation
from ..domain.repository import (
    ContactRepository, 
    ContactPhoneRepository, 
    ContactEmailRepository, 
    ContactAddressRepository, 
    ContactPhoneProfitRepository,
    ContactEmailProfitRepository,
    ContactLocationProfitRepository,
    ContactLocationRepository
)


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
class CreateContactEmailUseCase:
    repository: ContactEmailRepository

    def execute(self, contact_email: ContactEmail) -> ContactEmail:
        return self.repository.create(contact_email)

@dataclass
class GetContactFromLocationIdUseCase:
    repository: ContactLocationRepository 

    def execute(self, location_id: int) -> str:
        return self.repository.get_from_location_id(location_id)


@dataclass
class CreateContactLocationUseCase:
    repository: ContactLocationRepository

    def execute(self, contact_location: ContactLocation) -> ContactLocation:
        return self.repository.create(contact_location)


@dataclass
class UpdateContactPhoneProfitUseCase:
    repository: ContactPhoneProfitRepository

    def execute(self, data: dict) -> int:
        return self.repository.update(data)

@dataclass
class UpdateContactEmailProfitUseCase:
    repository: ContactEmailProfitRepository

    def execute(self, data: dict) -> int:
        return self.repository.update(data)

@dataclass
class UpdateContactLocationProfitUseCase:
    repository: ContactLocationProfitRepository

    def execute(self, data: dict) -> int:
        return self.repository.update(data)

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

@dataclass
class DeleteContactLocationUseCase:
    repository: ContactLocationRepository

    def execute(self, location_id: int) -> None:
        return self.repository.delete(location_id)

@dataclass
class UpdateContactEmailUseCase:
    repository: ContactEmailRepository

    def execute(self, email_id: int, data: dict) -> ContactEmail:
        return self.repository.update(email_id, data)

@dataclass
class UpdateContactLocationUseCase:
    repository: ContactLocationRepository

    def execute(self, location_id: int, data: dict) -> ContactLocation:
        return self.repository.update(location_id, data)

@dataclass
class CreateContactAddressUseCase:
    repository: ContactAddressRepository

    def execute(self, contact_address: ContactAddress) -> ContactAddress:
        return self.repository.create(contact_address)

@dataclass
class UpdateContactAddressUseCase:
    repository: ContactAddressRepository

    def execute(self, address_id: int, data: dict) -> ContactAddress:
        return self.repository.update(address_id, data)

@dataclass
class DeleteContactAddressUseCase:
    repository: ContactAddressRepository

    def execute(self, address_id: int) -> None:
        return self.repository.delete(address_id)