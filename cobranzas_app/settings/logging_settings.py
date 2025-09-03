from decouple import config
from pathlib import Path
import os

# LOG_LEVEL can be overridden via environment (e.g., DEBUG, INFO, WARNING, ERROR)
LOG_LEVEL = config('LOG_LEVEL', default='INFO')

# Paths and log directory setup
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOG_DIR = BASE_DIR / 'logs'
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = LOG_DIR / 'app.log'
LOG_BACKUP_COUNT = int(config('LOG_BACKUP_COUNT', default=14))  # number of days to keep

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'console': {
            'format': '[%(asctime)s] %(levelname)s %(name)s | req=%(request_id)s user=%(user_id)s | %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'file': {
            'format': '[%(asctime)s] %(levelname)s %(name)s | req=%(request_id)s user=%(user_id)s | %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'console',
        },
        'file': {
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'formatter': 'file',
            'filename': str(LOG_FILE),
            'when': 'midnight',
            'interval': 1,
            'backupCount': LOG_BACKUP_COUNT,
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        # Keep Django logs
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        # Uncomment for SQL debugging in development
        # 'django.db.backends': {
        #     'handlers': ['console'],
        #     'level': 'DEBUG' if DEBUG else 'WARNING',
        #     'propagate': False,
        # },
        # Project apps (inherit root level/handlers)
        'authentication': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
        'cliente': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
        'cobranza': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
        'dashboard': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
        'import_service': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
        'shared': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
    }
}
