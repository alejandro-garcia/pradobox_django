from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
import os
from decouple import config
from .mssql_connector import MSSQLConnector


def get_sql_config_view():
    """Obtiene la configuración de SQL Server desde las variables de entorno"""
    try:
        sql_config = {
            'server': config('DATABASE_HOST', default=''),
            'database': config('DATABASE_NAME', default=''),
            'username': config('DATABASE_USER', default=''),
            'password': config('DATABASE_PASSWORD', default='')
        }
        
        return sql_config

    except Exception as e:
        return None


@api_view(['POST'])
def import_documentos_view(request):
    """Importa documentos desde SQL Server"""

    seller_code = request.data.get('sellerCode', None)

    try:
        with MSSQLConnector() as connector:
            documentos = connector.get_documentos_cc(seller_code)
            
            return Response(documentos)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['POST'])
def import_events_view(request):
    """Importa documentos desde SQL Server"""

    seller_code = request.data.get('sellerCode', None)

    try:
        with MSSQLConnector() as connector:
            documentos = connector.get_events_cc(seller_code)
            
            return Response(documentos)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@csrf_exempt
def import_clientes_view(request):
    """Importa clientes desde SQL Server"""
    try:
        #custom_query = request.data.get('query')
        cliente_codes = request.data.get('list_codes', [])
        query = """
            SELECT 
                co_cli,
                cli_des,
                rif,
                rif2,
                ltrim(rtrim(telefonos)) as telefonos,
                ltrim(rtrim(email)) as email,
                ltrim(rtrim(direccion)) as direccion,
                inactivo,
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
            ORDER BY cli_des
        """
        
        with MSSQLConnector() as connector:
            if len(cliente_codes) == 0:
                clientes = connector.execute_query(query)
            else:
                clientes = connector.get_clientes(cliente_codes)
            
            return Response(clientes)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['POST'])
@csrf_exempt
def import_sellers_view(request):
    """Importa Vendedores desde SQL Server"""
    try:
        
        with MSSQLConnector() as connector:
            sellers = connector.get_sellers()
            
            return Response(sellers)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['POST'])
@csrf_exempt
def import_document_details(request):
    """Importa Renglones de Documentos desde SQL Server"""
    seller_code = request.data.get('sellerCode', None)

    try:
        with MSSQLConnector() as connector:
            sellers = connector.get_document_details(seller_code)
            
            return Response(sellers)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
@csrf_exempt
def import_month_sales_view(request):
    seller_code = request.data.get('sellerCode', None)

    try:
        with MSSQLConnector() as connector:
            sales = connector.get_month_sales(seller_code)

            return Response(sales)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@csrf_exempt
def execute_custom_query_view(request):
    """Ejecuta una consulta personalizada"""
    try:
        query = request.data.get('query', '')
        

        with MSSQLConnector() as connector:
            results = connector.execute_query(query)
            
            return Response({
                'results': results,
                'count': len(results)
            })

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)