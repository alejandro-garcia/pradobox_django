class DomainException(Exception):
    """Base exception for domain errors"""
    pass


class EntityNotFoundException(DomainException):
    """Raised when an entity is not found"""
    pass


class ValidationException(DomainException):
    """Raised when domain validation fails"""
    pass


class BusinessRuleException(DomainException):
    """Raised when a business rule is violated"""
    pass