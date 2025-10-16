from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ..application.use_cases import (
    GetContactsByClientUseCase,
    CreateContactUseCase,
    UpdateContactUseCase,
)
from .repository_impl import DjangoContactRepository
from ..domain.entities import Contact, ContactPhone, ContactEmail, ContactAddress


repo = DjangoContactRepository()


def _serialize_contact(c: Contact) -> dict:
    return {
        'id': c.id,
        'client_id': c.client_id,
        'name': c.name,
        'first_name': c.first_name,
        'last_name': c.last_name,
        'phones': [
            {
                'id': p.id,
                'phone': p.phone,
                'phone_type': p.phone_type,
            }
            for p in c.phones
        ],
        'emails': [
            {
                'id': e.id,
                'email': e.email,
                'mail_type': e.mail_type,
            }
            for e in c.emails
        ],
        'addresses': [
            {
                'id': a.id,
                'address': a.address,
                'state': a.state,
                'zipcode': a.zipcode,
                'country_id': a.country_id,
            }
            for a in c.addresses
        ],
    }


@api_view(['GET'])
def contacts_by_client_view(request, client_id: str):
    use_case = GetContactsByClientUseCase(repo)
    contacts = use_case.execute(client_id)
    return Response([_serialize_contact(c) for c in contacts])


@api_view(['POST'])
def create_contact_view(request):
    data = request.data or {}
    contact = Contact(
        id=0,
        client_id=data.get('client_id'),
        name=data.get('name'),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        phones=[ContactPhone(id=0, phone=p['phone'], phone_type=p.get('phone_type', 'other'), contact_id=0) for p in data.get('phones', [])],
        emails=[ContactEmail(id=0, email=e['email'], mail_type=e.get('mail_type', 'other'), contact_id=0) for e in data.get('emails', [])],
        addresses=[ContactAddress(id=0, address=a['address'], state=a.get('state'), zipcode=a.get('zipcode'), country_id=a['country_id'], contact_id=0) for a in data.get('addresses', [])],
    )
    use_case = CreateContactUseCase(repo)
    created = use_case.execute(contact)
    return Response(_serialize_contact(created), status=status.HTTP_201_CREATED)


@api_view(['PUT', 'PATCH'])
def update_contact_view(request, contact_id: int):
    data = request.data or {}
    use_case = UpdateContactUseCase(repo)
    updated = use_case.execute(contact_id, data)
    return Response(_serialize_contact(updated))
