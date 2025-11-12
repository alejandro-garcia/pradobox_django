import pyodbc
from typing import List, Dict, Any
from django.conf import settings


class MSSQLConnector:
    def __init__(self):
        from decouple import config
        #print(config('DATABASE_HOST', default=''))
    
    
        self.server = config('DATABASE_HOST', default='')
        self.database = config('DATABASE_NAME', default='')
        self.username = config('DATABASE_USER', default='')
        self.password = config('DATABASE_PASSWORD', default='')
        self.driver = config('DATABASE_DRIVER', default='{ODBC Driver 17 for SQL Server}')
        self.connection = None

    def connect(self):
        """Establece conexión con SQL Server"""
        try:
            connection_string = (
                f'DRIVER={self.driver};'
                f'SERVER={self.server};'
                f'DATABASE={self.database};'
                f'UID={self.username};'
                f'PWD={self.password};'
                'Trusted_Connection=no;'
                'Encrypt=yes;'
                'TrustServerCertificate=yes;'
            )
            
            self.connection = pyodbc.connect(connection_string, timeout=30)
            return True
        except Exception as e:
            print(f"Error connecting to MSSQL: {str(e)}")
            return False

    def test_connection(self) -> bool:
        """Prueba la conexión a la base de datos"""
        try:
            if self.connect():
                cursor = self.connection.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                cursor.close()
                return True
        except Exception as e:
            print(f"Connection test failed: {str(e)}")
        finally:
            self.disconnect()
        return False

    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Ejecuta una consulta y retorna los resultados como lista de diccionarios"""
        if not self.connection:
            if not self.connect():
                raise Exception("No se pudo establecer conexión con la base de datos")

        try:
            cursor = self.connection.cursor()
            cursor.execute(query)
            
            # Obtener nombres de columnas
            columns = [column[0] for column in cursor.description]
            
            # Obtener datos y convertir a lista de diccionarios
            results = []
            for row in cursor.fetchall():
                row_dict = {}
                for i, value in enumerate(row):
                    # Convertir tipos de datos especiales
                    if hasattr(value, 'isoformat'):  # datetime objects
                        row_dict[columns[i]] = value.isoformat()
                    elif isinstance(value, (int, float, str, bool)) or value is None:
                        row_dict[columns[i]] = value
                    else:
                        row_dict[columns[i]] = str(value)
                results.append(row_dict)
            
            cursor.close()
            return results
            
        except Exception as e:
            raise Exception(f"Error ejecutando consulta: {str(e)}")

    
    def get_documentos_cc(self, seller_code) -> List[Dict[str, Any]]:
        seller_codes = []
        if "," in seller_code:
            seller_codes = [c.strip() for c in seller_code.split(",")]
        else:
            seller_codes.append(seller_code)

        placeholders = ", ".join([f"'{c}'" for c in seller_codes])

        """Obtiene documentos de cuentas por cobrar según criterios específicos"""
        query = f"""
            SELECT 
                tipo_doc,
                nro_doc,
                co_cli,
                ltrim(rtrim(co_ven)) as co_ven,
                fec_emis,
                fec_venc,
                monto_net,
                saldo,
                anulado,
                empresa,
                monto_bru,
                monto_imp
            FROM docum_cc 
            WHERE saldo <> 0 AND anulado = 0
            and ltrim(rtrim(co_ven)) in ({placeholders})
            ORDER BY fec_venc DESC
        """

        return self.execute_query(query)


    def get_events_cc(self, seller_code) -> List[Dict[str, Any]]:
        seller_codes = []
        if "," in seller_code:
            seller_codes = [c.strip() for c in seller_code.split(",")]
        else:
            seller_codes.append(seller_code)

        placeholders = ", ".join([f"'{c}'" for c in seller_codes])

        """Obtiene documentos de cuentas por cobrar según criterios específicos"""
        query = f"""
            SELECT 
                tipo_doc,
                nro_doc,
                co_cli,
                ltrim(rtrim(co_ven)) as co_ven,
                fec_emis,
                fec_venc,
                monto_net,
                saldo,
                empresa
            FROM vw_eventos 
            WHERE ltrim(rtrim(co_ven)) in ({placeholders})
            ORDER BY fec_emis DESC
        """
        return self.execute_query(query)
  
    
    def get_document_details(self, seller_code) -> List[Dict[str, Any]]:
        seller_codes = []
        if "," in seller_code:
            seller_codes = [c.strip() for c in seller_code.split(",")]
        else:
            seller_codes.append(seller_code)

        placeholders = ", ".join([f"'{c}'" for c in seller_codes])

        """Obtiene documentos de cuentas por cobrar según criterios específicos"""
        query = f"""
            SELECT
                rtrim(convert(varchar, empresa)) + '-' + ltrim(rtrim(tipo_doc)) + '-' + convert(varchar, nro_doc) + '-' + convert(varchar, reng_num) as id,
                rtrim(convert(varchar, empresa)) + '-' + ltrim(rtrim(tipo_doc)) + '-' + convert(varchar, nro_doc) as doc_id,
                empresa,
                tipo_doc,
                nro_doc,
                ltrim(rtrim(co_ven)) as co_ven,
                reng_num,
                ltrim(rtrim(co_art)) as co_art,
                ltrim(rtrim(art_des)) as art_des,
                total_art,
                prec_vta, 
                total, 
                uni_venta
            FROM vw_renglones_documento 
            WHERE ltrim(rtrim(co_ven)) in ({placeholders})
        """
        return self.execute_query(query)

    def get_month_sales(self, seller_code) -> List[Dict[str, Any]]:
        seller_codes = []
        if "," in seller_code:
            seller_codes = [c.strip() for c in seller_code.split(",")]
        else:
            seller_codes.append(seller_code)

        placeholders = ", ".join([f"'{c}'" for c in seller_codes])

        """Obtiene documentos de cuentas por cobrar según criterios específicos"""
        query = f"""
            SELECT
                right(mes,2) as id,
                case right(mes,2) 
                   when '01' then 'ene'
                   when '02' then 'feb'
                   when '03' then 'mar'
                   when '04' then 'abr'
                   when '05' then 'may'
                   when '06' then 'jun'
                   when '07' then 'jul'
                   when '08' then 'ago'
                   when '09' then 'sep'
                   when '10' then 'oct'
                   when '11' then 'nov'
                   when '12' then 'dic'
                else mes end as mes,
                sum(monto_net) as monto
            FROM [vw_ventas_mensuales_vendedor] 
            WHERE ltrim(rtrim(co_ven)) in ({placeholders})
            group by mes
            order by id
        """
        return self.execute_query(query)

    
    def get_clientes(self, cliente_codes: List[str]) -> List[Dict[str, Any]]:
        """Obtiene clientes activos que están en la lista de códigos proporcionada"""
        if not cliente_codes:
            return []
        
        # Crear lista de códigos para la consulta IN
        if type(cliente_codes).__name__ == "str":
            codes_string = cliente_codes
        else:
            codes_string = "', '".join(cliente_codes)
        
        query = f"""
            SELECT 
                co_cli,
                cli_des,
                rif,
                rif2,
                ltrim(rtrim(telefonos)) as telefonos,
                ltrim(rtrim(email)) as email,
                ltrim(rtrim(direccion)) as direccion,
                dias_ult_fact, 
                dias_promedio_emision,
                neto, 
                creditos,
                total,
                ventas_ultimo_trimestre,
                plaz_pag,
                ltrim(rtrim(co_ven)) as co_ven,
                case when ltrim(rtrim(co_pais)) = '' then 'VE' else ltrim(rtrim(co_pais)) end as co_pais,
                ltrim(rtrim(ciudad)) as ciudad
            FROM clientes 
            WHERE co_cli IN ({codes_string})
            ORDER BY cli_des
        """
        return self.execute_query(query)


    def get_sellers(self) -> List[Dict[str, Any]]:
        query = f"""
            SELECT 
                ltrim(rtrim(co_ven)) as co_ven,
                ven_des,
                cedula,
                telefonos,
                email
            FROM vendedor 
        """
        return self.execute_query(query)

    
    def disconnect(self):
        """Cierra la conexión"""
        if self.connection:
            try:
                self.connection.close()
                self.connection = None
            except Exception as e:
                print(f"Error closing connection: {str(e)}")

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()