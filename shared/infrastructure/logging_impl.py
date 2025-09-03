import logging
import contextvars
from typing import Optional

# Context variables for request-scoped logging enrichment
_request_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)
_user_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("user_id", default=None)


class ContextFilter(logging.Filter):
    """Injects request_id and user_id into each log record if present in contextvars."""

    def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
        record.request_id = _request_id_var.get() or "-"
        record.user_id = _user_id_var.get() or "-"
        return True


def set_request_context(request_id: Optional[str] = None, user_id: Optional[str] = None) -> None:
    if request_id is not None:
        _request_id_var.set(request_id)
    if user_id is not None:
        _user_id_var.set(user_id)


def clear_request_context() -> None:
    _request_id_var.set(None)
    _user_id_var.set(None)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Return an application logger already wired to Django's LOGGING config.

    Usage:
        logger = get_logger(__name__)
    """
    logger = logging.getLogger(name if name else "app")

    # Ensure our context filter is added at least once to avoid duplicates
    has_filter = any(isinstance(f, ContextFilter) for f in logger.filters)
    if not has_filter:
        logger.addFilter(ContextFilter())

    return logger
