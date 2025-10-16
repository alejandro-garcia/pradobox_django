from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Country:
    id: int
    name: str


@dataclass
class ContactPhone:
    id: int
    phone: str
    phone_type: str  # one of: work, mobile, fax, home, skype, other
    contact_id: int


@dataclass
class ContactEmail:
    id: int
    email: str
    mail_type: str  # one of: work, personal, other
    contact_id: int


@dataclass
class ContactAddress:
    id: int
    address: str
    state: Optional[str]
    zipcode: Optional[str]
    country_id: int
    contact_id: int


@dataclass
class Contact:
    id: int
    name: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    # Aggregates (optional here for read convenience)
    phones: List[ContactPhone] = field(default_factory=list)
    emails: List[ContactEmail] = field(default_factory=list)
    addresses: List[ContactAddress] = field(default_factory=list)
    # Foreign aggregate owner: client id (for grouping by cliente)
    client_id: Optional[str] = None
