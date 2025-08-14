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
@csrf_exempt
def import_documentos_view(request):
    """Importa documentos desde SQL Server"""
    try:

        # connection_config = get_sql_config_view()
        custom_query = request.data.get('query')


        with MSSQLConnector() as connector:
            if custom_query:
                documentos = connector.execute_query(custom_query)
            else:
                documentos = connector.get_documentos_cc()
            
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
        custom_query = request.data.get('query')
        cliente_codes = request.data.get('cliente_codes', [])
        

        with MSSQLConnector() as connector:
            if custom_query:
                clientes = connector.execute_query(custom_query)
            else:
                clientes = connector.get_clientes(cliente_codes)
            
            return Response(clientes)

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