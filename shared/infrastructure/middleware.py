import uuid
from typing import Optional
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpRequest, HttpResponse

from .logging_impl import set_request_context, clear_request_context


def _extract_user_id(request: HttpRequest) -> Optional[str]:
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        # Prefer explicit id or username as fallback
        return str(getattr(user, "id", None) or getattr(user, "pk", None) or getattr(user, "username", "")) or None
    return None


class RequestIdMiddleware(MiddlewareMixin):
    """Middleware that injects a request_id and user_id into logging context.

    - Reads request id from header `X-Request-ID` when present.
    - Otherwise generates a uuid4.
    - Exposes request_id on the response header as `X-Request-ID`.
    """

    header_name = "HTTP_X_REQUEST_ID"

    def process_request(self, request: HttpRequest) -> None:
        # Extract or create request id
        header_val = request.META.get(self.header_name)
        request_id = header_val if header_val else uuid.uuid4().hex

        # Try to resolve user id after authentication (this middleware should be placed
        # AFTER AuthenticationMiddleware to ensure request.user is set)
        user_id = _extract_user_id(request)

        # Set context for log enrichment
        set_request_context(request_id=request_id, user_id=user_id)

        # Stash for process_response in case we want to re-use
        setattr(request, "request_id", request_id)

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        # Propagate the request id in the response header
        request_id = getattr(request, "request_id", None)
        if request_id:
            response["X-Request-ID"] = request_id

        # Clear context to avoid leakage across requests in the same worker
        clear_request_context()
        return response

    def process_exception(self, request: HttpRequest, exception: Exception):
        # Ensure context cleared even if exceptions happen
        clear_request_context()
        return None
