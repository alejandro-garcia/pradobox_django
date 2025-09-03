from typing import List, Optional
from decimal import Decimal
from django.db import connection
from shared.domain.value_objects import Money, SellerId
from ..domain.entities import Vendedor
from ..domain.repository import ClienteRepository
from .models import VendedorModel

class DjangoVendedorRepository(ClienteRepository):
    
    def find_by_id(self, entity_id: SellerId) -> Optional[Vendedor]:
        try:
            cliente_model = VendedorModel.objects.get(id=entity_id.value)
            return self._to_domain(cliente_model)
        except VendedorModel.DoesNotExist:
            return None
    
    def find_all(self) -> List[Vendedor]:
        cliente_models = VendedorModel.objects.all().order_by('dias_ult_fact', 'nombre')
        return [self._to_domain(model) for model in cliente_models]
    
    def search_by_name(self, nombre: str) -> List[Vendedor]:
        cliente_models = VendedorModel.objects.filter(nombre__icontains=nombre).order_by('nombre')
        return [self._to_domain(model) for model in cliente_models]
    
    def _to_domain(self, model: VendedorModel) -> Vendedor:
        return Vendedor(
            id=SellerId(model.id),
            nombre=model.nombre,
            telefono=model.telefono,
            email=model.email
        )