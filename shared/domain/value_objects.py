from dataclasses import dataclass
from typing import Union
from decimal import Decimal


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "USD"
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
    
    def __add__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)
    
    def __sub__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot subtract different currencies")
        return Money(self.amount - other.amount, self.currency)


@dataclass(frozen=True)
class DocumentId:
    value: str
    
    def __post_init__(self):
        if not self.value or len(self.value.strip()) == 0:
            raise ValueError("Document ID cannot be empty")


@dataclass(frozen=True)
class ClientId:
    value: str
    rif: str = None
    
    def __post_init__(self):
        if not self.value or len(self.value.strip()) == 0:
            raise ValueError("Client ID cannot be empty")

@dataclass(frozen=True)
class SellerId:
    value: str 

    def __post_init__(self):
        if not self.value or len(self.value.strip()) == 0:
            raise ValueError("Seller ID cannot be empty")
