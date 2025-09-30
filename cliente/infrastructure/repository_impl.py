from typing import List, Optional
from decimal import Decimal
from django.db import connection
from shared.domain.value_objects import ClientId, MoneySigned, SellerId
from ..domain.entities import Cliente, ResumenCliente, ClientFilterCriteria
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
            seller_codes = []
            if "," in seller_id.value:
                seller_codes = [c.strip() for c in seller_id.value.split(",")]
            else:
                seller_codes.append(seller_id.value)
            
            cliente_models = cliente_models.filter(vendedor_id__in=seller_codes).order_by('dias_ult_fact', 'nombre')
       
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
            seller_codes = [] 
            if "," in seller_id.value: 
                seller_codes = [c.strip() for c in seller_id.value.split(",")]
            else:
                seller_codes.append(seller_id.value)

            cliente_models = cliente_models.filter(vendedor_id__in=seller_codes).order_by('dias_ult_fact', 'nombre')
        
        return [self._to_domain(model) for model in cliente_models]
    
    def search_by_name_seller_with_criteria(self, nombre: str, seller_id: SellerId, criteria: ClientFilterCriteria) -> List[Cliente]:
        qs = ClienteModel.objects.all()

        # Optional name filter
        if nombre and len(nombre) >= 3:
            qs = qs.filter(nombre__icontains=nombre)

        # Seller filter
        if seller_id and seller_id.value != "-1":
            seller_codes = []
            if "," in seller_id.value:
                seller_codes = [c.strip() for c in seller_id.value.split(",")]
            else:
                seller_codes.append(seller_id.value)
            qs = qs.filter(vendedor_id__in=seller_codes)

        # Map numeric buckets
        def apply_bucket(queryset, field_name: str, bucket: str):
            mapping = {
                'lessTen': (0, 10),
                'lestHundred': (11, 100),
                'lestThousand': (101, 1000),
                'lestTenThousand': (1001, 10000),
                'overTenThousand': (10001, None)
            }
            if not bucket or bucket == 'all':
                return queryset
            rng = mapping.get(bucket)
            if not rng:
                return queryset
            min_v, max_v = rng
            if min_v is not None:
                queryset = queryset.filter(**{f"{field_name}__gte": min_v})
            if max_v is not None:
                queryset = queryset.filter(**{f"{field_name}__lte": max_v})
            return queryset

        # Map days buckets
        def apply_days_bucket(queryset, field_name: str, bucket: str):
            mapping = {
                'upToSeven': (0, 7),
                'upToFourteen': (8, 14),
                'upToThirty': (15, 30),
                'upToSixty': (31, 60),
                'upToNinety': (61, 90)
            }
            if not bucket or bucket == 'all':
                return queryset
            rng = mapping.get(bucket)
            if not rng:
                return queryset
            min_v, max_v = rng
            if min_v is not None:
                queryset = queryset.filter(**{f"{field_name}__gte": min_v})
            if max_v is not None:
                queryset = queryset.filter(**{f"{field_name}__lte": max_v})
            return queryset

        # Apply criteria
        # We don't have a last-year sales field; approximate with ventas_ultimo_trimestre
        if criteria:
            if criteria.lastYearSales:
                qs = apply_bucket(qs, 'ventas_ultimo_trimestre', criteria.lastYearSales)
            if criteria.overdueDebt:
                qs = apply_bucket(qs, 'vencido', criteria.overdueDebt)
            if criteria.totalOverdue:
                qs = apply_bucket(qs, 'total', criteria.totalOverdue)
            if criteria.daysSinceLastInvoice:
                qs = apply_days_bucket(qs, 'dias_ult_fact', criteria.daysSinceLastInvoice)
            # criteria.daysPastDue is not available at client level; would require join/aggregate on documents

        # Ordering
        if criteria and criteria.orderField:
            field_map = {
                'lastYearSales': 'ventas_ultimo_trimestre',
                'overdueDebt': 'vencido',
                'totalOverdue': 'total',
                'daysSinceLastInvoice': 'dias_ult_fact',
            }
            field = field_map.get(criteria.orderField)
            if field:
                prefix = '-' if (criteria.orderDesc is True) else ''
                qs = qs.order_by(f"{prefix}{field}", 'nombre')
            else:
                qs = qs.order_by('dias_ult_fact', 'nombre')
        else:
            qs = qs.order_by('dias_ult_fact', 'nombre')

        return [self._to_domain(model) for model in qs]
    
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
                    cantidad_vencidos = row[4]
                    cantidad_documentos = row[3] + row[4]
                    dias_promedio = row[14]
                else:
                    # Datos de ejemplo si no hay documentos
                    vencido, por_vencer, creditos, cantidad, dias_promedio = Decimal('0'), Decimal('0'), Decimal('0'), 0, 0
            
            # TODO: AGREGAR LOS CAMPOS QUE FALTAN EN EL S.P. 
            return ResumenCliente(
                cliente_id=cliente_id,
                nombre=cliente_model.nombre,
                rif=cliente_model.rif,
                total_vencido=MoneySigned(Decimal(str(vencido))),
                total_por_vencer=MoneySigned(Decimal(str(por_vencer))),
                total_creditos=MoneySigned(Decimal(str(creditos))),
                total_sinvencimiento= 0, #FALTA EN EL SP
                cantidad_documentos=int(cantidad_documentos),
                cantidad_documentos_vencidos=int(cantidad_vencidos), # FALTA EN EL SP
                dias_promedio_vencimiento=int(dias_promedio),
                dias_promedio_vencimiento_todos=0 # FALTA EN EL SP
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
                                total_vencido=MoneySigned(Decimal(str(vencido))),
                                total_por_vencer=MoneySigned(Decimal(str(por_vencer))),
                                total_creditos=MoneySigned(Decimal(str(creditos))),
                                total_sinvencimiento=0, #FALTA EN EL SP.
                                cantidad_documentos=int(cantidad),
                                cantidad_documentos_vencidos= 0, #FALTA
                                dias_promedio_vencimiento=int(dias_promedio),
                                dias_promedio_vencimiento_todos=0 #FALTA EN EL SP
                                ))
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
            rif2=model.rif2,
            telefono=model.telefono,
            email=model.email,
            direccion=model.direccion,
            vendedor=model.vendedor.nombre if model.vendedor else None,
            dias_ult_fact=model.dias_ult_fact,
            dias_promedio_emision=model.dias_promedio_emision,
            vencido=model.vencido,
            total=model.total,
            ventas_ultimo_trimestre=model.ventas_ultimo_trimestre
        )