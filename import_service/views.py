from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
from .mssql_connector import MSSQLConnector


@api_view(['POST'])
@csrf_exempt
def test_connection_view(request):
    """Prueba la conexión a SQL Server"""
    try:
        connection_config = request.data.get('connection', {})
        
        if not all(key in connection_config for key in ['server', 'database', 'username', 'password']):
            return Response({
                'success': False,
                'error': 'Faltan parámetros de conexión requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)

        connector = MSSQLConnector(connection_config)
        success = connector.test_connection()
        
        return Response({
            'success': success,
            'message': 'Conexión exitosa' if success else 'Error de conexión'
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@csrf_exempt
def import_documentos_view(request):
    """Importa documentos desde SQL Server"""
    try:
        connection_config = request.data.get('connection', {})
        custom_query = request.data.get('query')
        
        if not connection_config:
            return Response({
                'error': 'Configuración de conexión requerida'
            }, status=status.HTTP_400_BAD_REQUEST)

        with MSSQLConnector(connection_config) as connector:
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
        connection_config = request.data.get('connection', {})
        custom_query = request.data.get('query')
        cliente_codes = request.data.get('cliente_codes', [])
        
        if not connection_config:
            return Response({
                'error': 'Configuración de conexión requerida'
            }, status=status.HTTP_400_BAD_REQUEST)

        with MSSQLConnector(connection_config) as connector:
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
        connection_config = request.data.get('connection', {})
        query = request.data.get('query', '')
        
        if not connection_config or not query:
            return Response({
                'error': 'Configuración de conexión y consulta requeridas'
            }, status=status.HTTP_400_BAD_REQUEST)

        with MSSQLConnector(connection_config) as connector:
            results = connector.execute_query(query)
            
            return Response({
                'results': results,
                'count': len(results)
            })

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)