from typing import List, Optional
from decimal import Decimal
from django.db import connection
from shared.domain.value_objects import ClientId, Money
from ..domain.entities import Cliente, ResumenCliente
from ..domain.repository import ClienteRepository
from .models import ClienteModel


class DjangoClienteRepository(ClienteRepository):
    
    def find_by_id(self, entity_id: ClientId) -> Optional[Cliente]:
        try:
            cliente_model = ClienteModel.objects.get(id=entity_id.value)
            return self._to_domain(cliente_model)
        except ClienteModel.DoesNotExist:
            return None
    
    def find_all(self) -> List[Cliente]:
        cliente_models = ClienteModel.objects.all()
        return [self._to_domain(model) for model in cliente_models]
    
    
    def find_by_rif(self, rif: str) -> Optional[Cliente]:
        try:
            cliente_model = ClienteModel.objects.get(rif=rif)
            return self._to_domain(cliente_model)
        except ClienteModel.DoesNotExist:
            return None
    
    def search_by_name(self, nombre: str) -> List[Cliente]:
        cliente_models = ClienteModel.objects.filter(nombre__icontains=nombre)
        return [self._to_domain(model) for model in cliente_models]
    
    def get_resumen_cliente(self, cliente_id: ClientId) -> Optional[ResumenCliente]:
        try:
            cliente_model = ClienteModel.objects.get(id=cliente_id.value)
            
            # Consulta simulada para obtener resumen de cobranzas
            # En una implementación real, esto vendría de las tablas de documentos/cobranzas
            with connection.cursor() as cursor:
                cursor.execute("""
                   EXEC [pp_consulta_edo_cuenta_consolidado_cliente] @co_cli = %s
                """, [cliente_id.value])
                # cursor.execute("""
                #     SELECT 
                #         COALESCE(SUM(CASE WHEN fecha_vencimiento < CURRENT_DATE THEN monto ELSE 0 END), 0) as vencido,
                #         COALESCE(SUM(CASE WHEN fecha_vencimiento >= CURRENT_DATE THEN monto ELSE 0 END), 0) as por_vencer,
                #         COALESCE(SUM(CASE WHEN tipo = 'CREDITO' THEN monto ELSE 0 END), 0) as creditos,
                #         COUNT(*) as cantidad,
                #         COALESCE(AVG(CASE WHEN fecha_vencimiento < CURRENT_DATE 
                #                     THEN julianday('now') - julianday(fecha_vencimiento) 
                #                     ELSE 0 END), 0) as dias_promedio
                #     FROM documentos 
                #     WHERE cliente_id = %s
                # """, [cliente_id.value])
                
                row = cursor.fetchone()
                if row:
                    #vencido, por_vencer, creditos, cantidad, dias_promedio = row
                    vencido = row[11] if row[11] > 0 else 0
                    por_vencer = row[2] if row[2] > 0 else 0
                    creditos = row[6] if row[6] >= 0 else row[6] * -1
                    cantidad = row[3]
                    dias_promedio = row[14]
                else:
                    # Datos de ejemplo si no hay documentos
                    vencido, por_vencer, creditos, cantidad, dias_promedio = Decimal('0'), Decimal('0'), Decimal('0'), 0, 0
            
            return ResumenCliente(
                cliente_id=cliente_id,
                nombre=cliente_model.nombre,
                rif=cliente_model.rif,
                total_vencido=Money(Decimal(str(vencido))),
                total_por_vencer=Money(Decimal(str(por_vencer))),
                total_creditos=Money(Decimal(str(creditos))),
                cantidad_documentos=int(cantidad),
                dias_promedio_vencimiento=int(dias_promedio)
            )
            
        except ClienteModel.DoesNotExist:
            return None
    
    def _to_domain(self, model: ClienteModel) -> Cliente:
        return Cliente(
            id=ClientId(model.id),
            nombre=model.nombre,
            rif=model.rif,
            telefono=model.telefono,
            email=model.email,
            direccion=model.direccion
        )