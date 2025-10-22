from typing import List, Optional

from ..domain.entities import Contact, ContactPhone, ContactEmail, ContactAddress
from ..domain.repository import ContactRepository, ContactPhoneRepository, ContactEmailRepository
from .models import ContactModel, ContactPhoneModel, ContactEmailModel, ContactAddressModel


class DjangoContactRepository(ContactRepository):
    def find_by_client(self, client_id: str) -> List[Contact]:
        qs = ContactModel.objects.filter(client=client_id).prefetch_related('phones', 'emails', 'addresses')
        return [self._to_domain(c) for c in qs]

    def find_by_id(self, contact_id: int) -> Optional[Contact]:
        try:
            c = ContactModel.objects.prefetch_related('phones', 'emails', 'addresses').get(pk=contact_id)
            return self._to_domain(c)
        except ContactModel.DoesNotExist:
            return None

    def create(self, contact: Contact) -> Contact:
        c = ContactModel.objects.create(
            client=contact.client_id,
            name=contact.name,
            first_name=contact.first_name,
            last_name=contact.last_name,
        )
        # Optionally create nested items if provided
        for p in contact.phones:
            ContactPhoneModel.objects.create(contact=c, phone=p.phone, phone_type=p.phone_type)
        for e in contact.emails:
            ContactEmailModel.objects.create(contact=c, email=e.email, mail_type=e.mail_type)
        for a in contact.addresses:
            ContactAddressModel.objects.create(contact=c, address=a.address, state=a.state, zipcode=a.zipcode, country_id=a.country_id)
        return self._to_domain(c)

    def update(self, contact_id: int, data: dict) -> Contact:
        c = ContactModel.objects.get(pk=contact_id)
        for field in ['name', 'first_name', 'last_name']:
            if field in data:
                setattr(c, field, data[field])
        c.save()
        return self._to_domain(c)

    def _to_domain(self, c: ContactModel) -> Contact:
        phones = [ContactPhone(id=p.id, phone=p.phone, phone_type=p.phone_type, contact_id=c.id) for p in c.phones.all()]
        emails = [ContactEmail(id=e.id, email=e.email, mail_type=e.mail_type, contact_id=c.id) for e in c.emails.all()]
        addresses = [ContactAddress(id=a.id, address=a.address, state=a.state, zipcode=a.zipcode, country_id=a.country_id, contact_id=c.id) for a in c.addresses.all()]
        return Contact(
            id=c.id,
            name=c.name,
            first_name=c.first_name,
            last_name=c.last_name,
            phones=phones,
            emails=emails,
            addresses=addresses,
            client_id=c.client,
        )


class DjangoContactPhoneRepository(ContactPhoneRepository):
    def create(self, contact_phone: ContactPhone) -> ContactPhone:
        cp = ContactPhoneModel.objects.create(contact=contact_phone.contact_id, phone=contact_phone.phone, phone_type=contact_phone.phone_type)
        return ContactPhone(id=cp.id, phone=cp.phone, phone_type=cp.phone_type, contact_id=cp.contact_id)

    def update(self, contact_phone_id: int, data: dict) -> ContactPhone:
        cp = ContactPhoneModel.objects.get(pk=contact_phone_id)
        for field in ['phone', 'phone_type']:
            if field in data:
                setattr(cp, field, data[field])
        cp.save()
        return ContactPhone(id=cp.id, phone=cp.phone, phone_type=cp.phone_type, contact_id=cp.contact_id)

    def delete(self, contact_phone_id: int) -> None:
        cp = ContactPhoneModel.objects.get(pk=contact_phone_id)
        cp.delete()

    def find_by_contact(self, contact_id: int) -> List[ContactPhone]:
        return [ContactPhone(id=p.id, phone=p.phone, phone_type=p.phone_type, contact_id=p.contact_id) for p in ContactPhoneModel.objects.filter(contact=contact_id)]


class DjangoContactEmailRepository(ContactEmailRepository):
    def create(self, contact_email: ContactEmail) -> ContactEmail:
        ce = ContactEmailModel.objects.create(contact=contact_email.contact_id, email=contact_email.email, mail_type=contact_email.mail_type)
        return ContactEmail(id=ce.id, email=ce.email, mail_type=ce.mail_type, contact_id=ce.contact_id)
    
    def update(self, contact_email_id: int, data: dict) -> ContactEmail:
        ce = ContactEmailModel.objects.get(pk=contact_email_id)
        for field in ['email', 'mail_type']:
            if field in data:
                setattr(ce, field, data[field])
        ce.save()
        return ContactEmail(id=ce.id, email=ce.email, mail_type=ce.mail_type, contact_id=ce.contact_id)
    
    def delete(self, contact_email_id: int) -> None:
        ce = ContactEmailModel.objects.get(pk=contact_email_id)
        ce.delete()
    
    def find_by_contact(self, contact_id: int) -> List[ContactEmail]:
        return [ContactEmail(id=e.id, email=e.email, mail_type=e.mail_type, contact_id=e.contact_id) for e in ContactEmailModel.objects.filter(contact=contact_id)]
