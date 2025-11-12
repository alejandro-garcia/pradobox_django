from typing import List, Optional

from ..domain.entities import Contact, ContactPhone, ContactEmail, ContactAddress, ContactLocation
from ..domain.repository import (
    ContactRepository, 
    ContactPhoneRepository, 
    ContactEmailRepository, 
    ContactAddressRepository, 
    ContactLocationRepository,
    ContactPhoneProfitRepository,
    ContactEmailProfitRepository
)
from .models import ContactModel, ContactPhoneModel, ContactEmailModel, ContactAddressModel, ContactLocationModel
from django.db import connections

import logging
logger = logging.getLogger(__name__)


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

    def delete(self, contact_id: int) -> None:
        c = ContactModel.objects.get(pk=contact_id)
        c.delete()

    def _to_domain(self, c: ContactModel) -> Contact:
        phones = [ContactPhone(id=p.id, phone=p.phone, phone_type=p.phone_type, contact_id=c.id, client_id= c.client) for p in c.phones.all()]
        emails = [ContactEmail(id=e.id, email=e.email, mail_type=e.mail_type, contact_id=c.id, client_id= c.client) for e in c.emails.all()]
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
            updated_at=c.updated_at,
            created_at=c.created_at
        )


class DjangoContactPhoneRepository(ContactPhoneRepository):
    def create(self, contact_phone: dict) -> ContactPhone:
        cp = ContactPhoneModel.objects.create(contact_id=contact_phone['contact_id'], phone=contact_phone['phone'], phone_type=contact_phone['phone_type'])
        return ContactPhone(id=cp.id, phone=cp.phone, phone_type=cp.phone_type, contact_id=cp.contact_id, client_id=contact_phone['client_id'])

    def update(self, contact_phone_id: int, data: dict) -> ContactPhone:
        cp = ContactPhoneModel.objects.get(pk=contact_phone_id)
        for field in ['phone', 'phone_type']:
            if field in data:
                setattr(cp, field, data[field])
        cp.save()
        return ContactPhone(id=cp.id, phone=cp.phone, phone_type=cp.phone_type, contact_id=cp.contact_id, client_id=data['client_id'])

    def delete(self, contact_phone_id: int) -> None:
        cp = ContactPhoneModel.objects.get(pk=contact_phone_id)
        cp.delete()

    def delete_by_contact_id(self, contact_id: int) -> None:
        ContactPhoneModel.objects.filter(contact=contact_id).delete()

    def find_by_contact(self, contact_id: int) -> List[ContactPhone]:
        return [ContactPhone(id=p.id, phone=p.phone, phone_type=p.phone_type, contact_id=p.contact_id) for p in ContactPhoneModel.objects.filter(contact=contact_id)]


class DjangoContactEmailRepository(ContactEmailRepository):
    def create(self, contact_email: dict) -> ContactEmail:
        ce = ContactEmailModel.objects.create(contact_id=contact_email['contact_id'], email=contact_email['email'], mail_type=contact_email['mail_type'])
        return ContactEmail(id=ce.id, email=ce.email, mail_type=ce.mail_type, contact_id=ce.contact_id, client_id=contact_email['client_id'])
    
    def update(self, contact_email_id: int, data: dict) -> ContactEmail:
        ce = ContactEmailModel.objects.get(pk=contact_email_id)
        for field in ['email', 'mail_type']:
            if field in data:
                setattr(ce, field, data[field])
        ce.save()
        return ContactEmail(id=ce.id, email=ce.email, mail_type=ce.mail_type, contact_id=ce.contact_id, client_id=data['client_id'])
    
    def delete(self, contact_email_id: int) -> None:
        ce = ContactEmailModel.objects.get(pk=contact_email_id)
        ce.delete()
    
    def delete_by_contact_id(self, contact_id: int) -> None:
        ContactEmailModel.objects.filter(contact=contact_id).delete()
    
    def find_by_contact(self, contact_id: int) -> List[ContactEmail]:
        return [ContactEmail(id=e.id, email=e.email, mail_type=e.mail_type, contact_id=e.contact_id) for e in ContactEmailModel.objects.filter(contact=contact_id)]


class DjangoContactAddressRepository(ContactAddressRepository):
    def create(self, address: ContactAddress) -> ContactAddress:
        ca = ContactAddressModel.objects.create(contact=address.contact_id, address=address.address, state=address.state, zipcode=address.zipcode, country_id=address.country_id)
        return ContactAddress(id=ca.id, address=ca.address, state=ca.state, zipcode=ca.zipcode, country_id=ca.country_id, contact_id=ca.contact_id)
    
    def update(self, address_id: int, data: dict) -> ContactAddress:
        return super().update(address_id, data)

    def delete(self, address_id: int) -> None:
        ca = ContactAddressModel.objects.get(pk=address_id)
        ca.delete()
    
    def delete_by_contact_id(self, contact_id: int) -> None:
        logger.info(f"Deleting addresses for contact {contact_id}")
        ContactAddressModel.objects.filter(contact=contact_id).delete()

    def find_by_id(self, address_id: int) -> Optional[ContactAddress]:
        try:
            ca = ContactAddressModel.objects.get(pk=address_id)
            return ContactAddress(id=ca.id, address=ca.address, state=ca.state, zipcode=ca.zipcode, country_id=ca.country_id, contact_id=ca.contact_id)
        except ContactAddressModel.DoesNotExist:
            return None
    
    def find_by_contact(self, contact_id: int) -> List[ContactAddress]:
        return [ContactAddress(id=a.id, address=a.address, state=a.state, zipcode=a.zipcode, country_id=a.country_id, contact_id=a.contact_id) for a in ContactAddressModel.objects.filter(contact=contact_id)]


class ProfitContactPhoneRepository(ContactPhoneProfitRepository):
    def update(self, data: dict) -> int:
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                EXECUTE pp_actualizar_telefono %s, %s
            """, [data['client_id'], data['phone']])
            
            #columns = [col[0] for col in cursor.description]
            #row = cursor.fetchone()
            rows = cursor.fetchall()
            
            if rows:
                #return dict(zip(columns, row))
                result = rows[0][0] + rows[0][1]
                return result
            return 0

class ProfitContactEmailRepository(ContactEmailProfitRepository):
    def update(self, data: dict) -> int:
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                EXECUTE pp_actualizar_email %s, %s
            """, [data['client_id'], data['email']])
            
            rows = cursor.fetchall()
            
            if rows:
                #return dict(zip(columns, row))
                result = rows[0][0] + rows[0][1]
                return result
            return 0

class DjangoContactLocationRepository(ContactLocationRepository):
    def create(self, location: dict) -> ContactLocation:
        cl = ContactLocationModel.objects.create(contact_id=location['contact_id'], location=location['location'])
        return ContactLocation(id=cl.id, location=cl.location, contact_id=cl.contact_id, client_id=location['client_id'])
    
    def update(self, location_id: int, data: dict) -> ContactLocation:
        cl = ContactLocationModel.objects.get(pk=location_id)
        for field in ['location']:
            if field in data:
                setattr(cl, field, data[field])
        cl.save()
        return ContactLocation(id=cl.id, location=cl.location, contact_id=cl.contact_id, client_id=data['client_id'])
    
    def delete(self, location_id: int) -> None:
        cl = ContactLocationModel.objects.get(pk=location_id)
        cl.delete()
    
    def delete_by_contact_id(self, contact_id: int) -> None:
        ContactLocationModel.objects.filter(contact=contact_id).delete()
    
    def find_by_contact(self, contact_id: int) -> List[ContactLocation]:
        return [ContactLocation(id=l.id, location=l.location, contact_id=l.contact_id) for l in ContactLocationModel.objects.filter(contact=contact_id)]
