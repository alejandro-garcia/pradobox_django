from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ..application.use_cases import (
    GetContactsByClientUseCase,
    CreateContactUseCase,
    UpdateContactUseCase,
    UpdateContactPhoneUseCase,
    DeleteContactPhoneUseCase,
    CreateContactPhoneUseCase,
    UpdateContactEmailUseCase,        
)
from .repository_impl import DjangoContactPhoneRepository, DjangoContactRepository, DjangoContactEmailRepository
from ..domain.entities import Contact, ContactPhone, ContactEmail, ContactAddress
from cliente.infrastructure.models import ClienteModel
from typing import Optional


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

def _get_state(client: ClienteModel) -> Optional[str]:

    if not client.ciudad or client.ciudad.strip() == '':
        return None

    ciudad = client.ciudad.strip().lower()

    if ciudad in ['caracas', 'caraccas', 'caracaas', 'caraca', 'cararacas', 'caracs']:
        return 'D.C.'
    elif ciudad == 'maracaibo':
        return 'Zulia'
    elif ciudad == 'valencia':
        return 'Carabobo'
    else:
        return None

@api_view(['GET'])
def contacts_by_client_view(request, client_id: str):
    use_case = GetContactsByClientUseCase(repo)
    contacts = use_case.execute(client_id)
    if not contacts:
        try:
            client = ClienteModel.objects.get(id=client_id)

            phone = None
            email = None
            address = None

            if (client.telefono and len(client.telefono.strip()) > 0):
                phone = ContactPhone(id=0, phone=client.telefono, phone_type='work', contact_id=0)

            if (client.email and len(client.email.strip()) > 0):
                email = ContactEmail(id=0, email=client.email, mail_type='work', contact_id=0)

            if (client.direccion and len(client.direccion.strip()) > 0):
                country_code = 1
                zip = client.zip if client.zip and len(client.zip.strip()) > 0 else None 

                state = _get_state(client)

                address = ContactAddress(id=0, address=client.direccion, state=state, zipcode=zip, country_id=country_code, contact_id=0)

            contact = Contact(
                id=0,
                client_id=client_id,
                name=client.nombre,
                first_name='',
                last_name='',
                phones=[phone] if phone else [],
                emails=[email] if email else [],
                addresses=[address] if address else []
            )
            CreateContactUseCase(repo).execute(contact)
        except ClienteModel.DoesNotExist as e:
            print(str(e))
        except Exception as e:
            print(str(e))
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

@api_view(['POST'])
def create_phone_view(request):
    data = request.data or {}
    use_case = CreateContactPhoneUseCase(repo)
    created = use_case.execute(data)
    return Response(_serialize_contact_phone(created), status=status.HTTP_201_CREATED)

@api_view(['POST'])
def update_phone_view(request, phone_id: int):
    data = request.data or {}
    repo = DjangoContactPhoneRepository()
    use_case = UpdateContactPhoneUseCase(repo)
    updated = use_case.execute(phone_id, data)
    return Response(_serialize_contact_phone(updated))

@api_view(['DELETE'])
def delete_phone_view(request, phone_id: int):
    use_case = DeleteContactPhoneUseCase(repo)
    use_case.execute(phone_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def update_mail_view(request, mail_id: int):
    data = request.data or {}
    repo = DjangoContactEmailRepository()
    use_case = UpdateContactEmailUseCase(repo)
    updated = use_case.execute(mail_id, data)
    return Response(_serialize_contact_mail(updated))

@api_view(['DELETE'])
def delete_mail_view(request, mail_id: int):
    use_case = DeleteContactEmailUseCase(repo)
    use_case.execute(mail_id)
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
def create_mail_view(request):
    data = request.data or {}
    use_case = CreateContactEmailUseCase(repo)
    created = use_case.execute(data)
    return Response(_serialize_contact_mail(created), status=status.HTTP_201_CREATED)


def _serialize_contact_phone(cp: ContactPhone) -> dict:
    result = {
        'id': cp.id,
        'phone': cp.phone,
        'phone_type': cp.phone_type,
    }
    return result

def _serialize_contact_mail(cm: ContactEmail) -> dict:
    result = {
        'id': cm.id,
        'email': cm.email,
        'mail_type': cm.mail_type,
    }
    return result


