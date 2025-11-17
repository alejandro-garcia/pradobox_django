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
    UpdateContactAddressUseCase,
    DeleteContactAddressUseCase,
    CreateContactAddressUseCase,
    UpdateContactPhoneProfitUseCase,
    UpdateContactEmailProfitUseCase,
    CreateContactEmailUseCase,
    CreateContactLocationUseCase,
    UpdateContactLocationUseCase,
    DeleteContactLocationUseCase,
    UpdateContactLocationProfitUseCase,
    GetContactFromLocationIdUseCase
)
from .repository_impl import (
    DjangoContactPhoneRepository, 
    DjangoContactRepository, 
    DjangoContactEmailRepository, 
    DjangoContactAddressRepository, 
    ProfitContactPhoneRepository, 
    ProfitContactEmailRepository,
    ProfitContactLocationRepository,
    DjangoContactLocationRepository
)
from ..domain.entities import Contact, ContactPhone, ContactEmail, ContactAddress, ContactLocation
from cliente.infrastructure.models import ClienteModel
from typing import Optional
from datetime import timedelta


repo = DjangoContactRepository()

cities_states = {
    "caracas": "Distrito Capital",
    "maracaibo": "Zulia",
    "valencia": "Carabobo",
    "barquisimeto": "Lara",
    "maracay": "Aragua",
    "ciudad guayana": "Bolívar",
    "barcelona": "Anzoátegui",
    "puerto la cruz": "Anzoátegui",
    "maturín": "Monagas",
    "san cristóbal": "Táchira",
    "barinas": "Barinas",
    "cumaná": "Sucre",
    "puerto ordaz": "Bolívar",
    "guatire": "Miranda",
    "guarenas": "Miranda",
    "los teques": "Miranda",
    "la guaira": "La Guaira",
    "san felipe": "Yaracuy",
    "acarigua": "Portuguesa",
    "araure": "Portuguesa",
    "el tigre": "Anzoátegui",
    "coro": "Falcón",
    "trujillo": "Trujillo",
    "mérida": "Mérida",
    "valera": "Trujillo",
    "san carlos": "Cojedes",
    "san fernando de apure": "Apure",
    "guanare": "Portuguesa",
    "carúpano": "Sucre",
    "tucupita": "Delta Amacuro",
    "el vigía": "Mérida",
    "ciudad bolívar": "Bolívar",
    "la asunción": "Nueva Esparta",
    "porlamar": "Nueva Esparta",
    "punto fijo": "Falcón",
    "guacara": "Carabobo",
    "naguanagua": "Carabobo",
    "tinaquillo": "Cojedes",
    "ocumare del tuy": "Miranda",
    "charallave": "Miranda",
    "san juan de los morros": "Guárico",
    "calabozo": "Guárico",
    "valle de la pascua": "Guárico",
    "cabimas": "Zulia",
    "santa rita": "Zulia",
    "machiques": "Zulia"
}



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
        'location': {
            'id': c.location.id,
            'latitude': c.location.latitude,
            'longitude': c.location.longitude,
        } if c.location else None
    }

def _get_state(client: ClienteModel) -> Optional[str]:

    if not client.ciudad or client.ciudad.strip() == '':
        return None

    ciudad = client.ciudad.strip().lower()

    if ciudad in ['caracas', 'caraccas', 'caracaas', 'caraca', 'cararacas', 'caracs']:
        ciudad = 'caracas'

    if ciudad in cities_states:
        return cities_states[ciudad]
    else:
        return None

@api_view(['GET'])
def contacts_by_client_view(request, client_id: str):
    use_case = GetContactsByClientUseCase(repo)
    contacts = use_case.execute(client_id)
    client = ClienteModel.objects.get(id=client_id)

    is_updated = False
    if not contacts:
        is_updated = True
    else: 
        update_at_utc = client.updated_at + timedelta(hours=4) 
        
        is_updated = update_at_utc > contacts[0].updated_at

        if not is_updated:
            is_updated = not contacts[0].location and client.geolocalizacion and client.geolocalizacion.strip() != ''
        
        if is_updated:
            DjangoContactPhoneRepository().delete_by_contact_id(contacts[0].id)
            DjangoContactEmailRepository().delete_by_contact_id(contacts[0].id)
            DjangoContactAddressRepository().delete_by_contact_id(contacts[0].id)
            DjangoContactLocationRepository().delete_by_contact_id(contacts[0].id)
            repo.delete(contacts[0].id)

    if is_updated:
        try:
            #client = ClienteModel.objects.get(id=client_id)

            phone = None
            email = None
            address = None
            location = None

            if (client.telefono and len(client.telefono.strip()) > 0):
                phone = ContactPhone(id=0, phone=client.telefono, phone_type='work', contact_id=0)

            if (client.email and len(client.email.strip()) > 0):
                email = ContactEmail(id=0, email=client.email, mail_type='work', contact_id=0, client_id=client_id)

            if (client.geolocalizacion and len(client.geolocalizacion.strip()) > 0):
                [latitude, longitude] = client.geolocalizacion.split(';')
                location = ContactLocation(id=0, latitude=latitude.strip(), longitude=longitude.strip(), contact_id=0, client_id=client_id)

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
                addresses=[address] if address else [], 
                location=location if location else None
            )

            new_contact = CreateContactUseCase(repo).execute(contact)
            contacts.append(new_contact)

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
        emails=[ContactEmail(id=0, email=e['email'], mail_type=e.get('mail_type', 'other'), contact_id=0, client_id=data.get('client_id')) for e in data.get('emails', [])],
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
    phone_repo = DjangoContactPhoneRepository()
    use_case = CreateContactPhoneUseCase(phone_repo)
    created = use_case.execute(data)

    use_case_profit = UpdateContactPhoneProfitUseCase(ProfitContactPhoneRepository())
    use_case_profit.execute(data)
    
    return Response(_serialize_contact_phone(created), status=status.HTTP_201_CREATED)

@api_view(['POST'])
def update_phone_view(request, phone_id: int):
    data = request.data or {}
    repo = DjangoContactPhoneRepository()
    
    use_case = UpdateContactPhoneUseCase(repo)
    updated = use_case.execute(phone_id, data)

    use_case_profit = UpdateContactPhoneProfitUseCase(ProfitContactPhoneRepository())
    use_case_profit.execute(data)

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

    use_case_profit = UpdateContactEmailProfitUseCase(ProfitContactEmailRepository())
    use_case_profit.execute(data)
    
    return Response(_serialize_contact_mail(updated))

@api_view(['POST'])
def update_location_view(request, location_id: int):
    data = request.data or {}
    repo = DjangoContactLocationRepository()
    use_case = UpdateContactLocationUseCase(repo)
    updated = use_case.execute(location_id, data)

    use_case_profit = UpdateContactLocationProfitUseCase(ProfitContactLocationRepository())
    use_case_profit.execute(data)
    
    return Response(_serialize_contact_location(updated))

@api_view(['DELETE'])
def delete_mail_view(request, mail_id: int):
    use_case = DeleteContactEmailUseCase(repo)
    use_case.execute(mail_id)
    return Response(status=status.HTTP_204_NO_CONTENT)
    
@api_view(['DELETE'])
def delete_location_view(request, location_id: int):
    try:
        repo = DjangoContactLocationRepository()

        use_case_client =  GetContactFromLocationIdUseCase(repo)
        client_id  = use_case_client.execute(location_id)

        use_case = DeleteContactLocationUseCase(repo)
        use_case.execute(location_id)

        use_case_profit = UpdateContactLocationProfitUseCase(ProfitContactLocationRepository())
        data = {
            'client_id': client_id,
            'location': ''
        }
        use_case_profit.execute(data) 

        return Response(status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        print(str(e))
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


@api_view(['POST'])
def create_mail_view(request):
    data = request.data or {}

    mail_repo = DjangoContactEmailRepository()
    use_case = CreateContactEmailUseCase(mail_repo)
    created = use_case.execute(data)

    use_case_profit = UpdateContactEmailProfitUseCase(ProfitContactEmailRepository())
    use_case_profit.execute(data)
    
    return Response(_serialize_contact_mail(created), status=status.HTTP_201_CREATED)
    
@api_view(['POST'])
def create_location_view(request):
    data = request.data or {}

    location_repo = DjangoContactLocationRepository()
    use_case = CreateContactLocationUseCase(location_repo)
    created = use_case.execute(data)

    use_case_profit = UpdateContactLocationProfitUseCase(ProfitContactLocationRepository())
    use_case_profit.execute(data)
    
    return Response(_serialize_contact_location(created), status=status.HTTP_201_CREATED)

@api_view(['POST'])
def create_address_view(request):
    data = request.data or {}
    use_case = CreateContactAddressUseCase(repo)
    created = use_case.execute(data)
    return Response(_serialize_contact_address(created), status=status.HTTP_201_CREATED)

@api_view(['POST'])
def update_address_view(request, address_id: int):
    data = request.data or {}
    use_case = UpdateContactAddressUseCase(repo)
    updated = use_case.execute(address_id, data)
    return Response(_serialize_contact_address(updated))

@api_view(['DELETE'])
def delete_address_view(request, address_id: int):
    use_case = DeleteContactAddressUseCase(repo)
    use_case.execute(address_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


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

def _serialize_contact_address(ca: ContactAddress) -> dict:
    result = {
        'id': ca.id,
        'address': ca.address,
        'state': ca.state,
        'zipcode': ca.zipcode,
        'country_id': ca.country_id,
    }
    return result

def _serialize_contact_location(cl: ContactLocation) -> dict:
    result = {
        'id': cl.id,
        'latitude': cl.latitude,
        'longitude': cl.longitude,
        'contact_id': cl.contact_id if cl.contact_id else 0,
        'client_id': cl.client_id if cl.client_id else '-1'
    }
    return result

