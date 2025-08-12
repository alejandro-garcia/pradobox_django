from .base import *
from .database import get_database_config

print('loading database config')
# Database configuration
DATABASES = get_database_config()