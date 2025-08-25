from typing import List, Optional
from decimal import Decimal
from django.db import connection
from shared.domain.value_objects import ClientId, Money, SellerId
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
        cliente_models = ClienteModel.objects.all().order_by('dias_ult_fact', 'nombre')
        return [self._to_domain(model) for model in cliente_models]
    
    
    def find_by_rif(self, rif: str) -> Optional[Cliente]:
        try:
            cliente_model = ClienteModel.objects.get(rif=rif)
            return self._to_domain(cliente_model)
        except ClienteModel.DoesNotExist:
            return None
        
    def find_by_seller(self, seller_id: SellerId) -> List[Cliente]:
        cliente_models = ClienteModel.objects.all().order_by('dias_ult_fact', 'nombre')
        
        if seller_id and seller_id.value != "-1":
            cliente_models = cliente_models.filter(vendedor__codigo=seller_id.value).order_by('dias_ult_fact', 'nombre')
        
        return [self._to_domain(model) for model in cliente_models]
    
    
    def search_by_name(self, nombre: str) -> List[Cliente]:
        cliente_models = ClienteModel.objects.filter(nombre__icontains=nombre).order_by('nombre')
        return [self._to_domain(model) for model in cliente_models]
    
    
    def search_by_name_and_seller(self, nombre: str, seller_id: SellerId) -> List[Cliente]:

        if not nombre or len(nombre) < 3:
            cliente_models = ClienteModel.objects.all().order_by('dias_ult_fact','nombre')
        else:
            cliente_models = ClienteModel.objects.filter(nombre__icontains=nombre).order_by('dias_ult_fact','nombre')
        
        if seller_id and seller_id.value != "-1":
            cliente_models = cliente_models.filter(vendedor__codigo=seller_id.value).order_by('dias_ult_fact', 'nombre')
        
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


    def get_resumen_por_vendedor(codigo_vendedor: str) -> Optional[List[ResumenCliente]]:
        try:
            results = []
            #cliente_model = ClienteModel.objects.get(id=cliente_id.value)
            
            # Consulta simulada para obtener resumen de cobranzas
            # En una implementación real, esto vendría de las tablas de documentos/cobranzas
            with connection.cursor() as cursor:
                cursor.execute("""
                   EXEC [pp_consulta_edo_cuenta_consolidado_cliente] @co_ven = %s
                """, [codigo_vendedor])
                
                rows = cursor.fetchall()

                if rows:
                    for row in rows:
                        #vencido, por_vencer, creditos, cantidad, dias_promedio = row
                        vencido = row[11] if row[11] > 0 else 0
                        por_vencer = row[2] if row[2] > 0 else 0
                        creditos = row[6] if row[6] >= 0 else row[6] * -1
                        cantidad = row[3]
                        dias_promedio = row[14]

                        cliente_id = None 
                        clientes = ClienteModel.objects.get(rif=row[0], nombre=row[1])
                        
                        if clientes:
                            cliente_id = clientes[0]['id'] 
                        else:
                            cliente_id = row[0]

                        results.append(
                            ResumenCliente(
                                cliente_id=cliente_id,
                                nombre=row[1],
                                rif=row[0],
                                total_vencido=Money(Decimal(str(vencido))),
                                total_por_vencer=Money(Decimal(str(por_vencer))),
                                total_creditos=Money(Decimal(str(creditos))),
                                cantidad_documentos=int(cantidad),
                                dias_promedio_vencimiento=int(dias_promedio)))
                #else:
                    # Datos de ejemplo si no hay documentos
                    #[vencido, por_vencer, creditos, cantidad, dias_promedio = Decimal('0'), Decimal('0'), Decimal('0'), 0, 0]
            return results
           
        except ClienteModel.DoesNotExist:
            return None
    
    def _to_domain(self, model: ClienteModel) -> Cliente:
        return Cliente(
            id=ClientId(model.id),
            nombre=model.nombre,
            rif=model.rif,
            telefono=model.telefono,
            email=model.email,
            direccion=model.direccion,
            dias_ult_fact=model.dias_ult_fact,
            vencido=model.vencido,
            total=model.total,
            ventas_ultimo_trimestre=model.ventas_ultimo_trimestre
        )