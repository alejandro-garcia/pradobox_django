import platform
import os
from pathlib import Path

def get_database_config():
    """
    Retorna la configuración de base de datos según el sistema operativo
    """
    is_linux = platform.system().lower() == 'linux'
    
    default_db = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': Path(__file__).resolve().parent.parent.parent / 'db.sqlite3',
        }
    }

    print('os.getenv', os.getenv('DATABASE_NAME'))
    
    if not all([
        os.getenv('DATABASE_NAME'),
        os.getenv('DATABASE_HOST'),
        os.getenv('DATABASE_USER'),
        os.getenv('DATABASE_PASSWORD')
    ]):
        return default_db

    mssql_config = {
        'default': {
            'ENGINE': 'mssql',
            'NAME': os.getenv('DATABASE_NAME'),
            'HOST': os.getenv('DATABASE_HOST'),
            'USER': os.getenv('DATABASE_USER'),
            'PASSWORD': os.getenv('DATABASE_PASSWORD'),
            'OPTIONS': {
                'driver': 'ODBC Driver 17 for SQL Server' if not is_linux else 'FreeTDS',
                'extra_params': "TDS_VERSION=7.4" if is_linux else "",
            }
        }
    }

    print("*** valor de mssql_config ***")
    print(mssql_config)

    return mssql_config