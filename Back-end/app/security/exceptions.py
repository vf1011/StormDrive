from fastapi import HTTPException , status
from typing import Any , Dict , Optional

class CustomHTTPException(HTTPException):
    def __init__(
            self ,
            status_code: int, 
            detail: str,
            headers: Optional[Dict[str,Any]] = None,
            error_code: Optional[str] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code
    
class ValidationException(CustomHTTPException):
    def __init__(self , detail: str , fields: Optional[Dict[str,str]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR"
        )
        self.fields = fields

class UnAuthorizedException(CustomHTTPException):
    def __init__(self , detail: str = "Not authenticated"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
            error_code="UNAUTHORIZED"
        )

class ForbiddenException(CustomHTTPException):
    def __init__(self , detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN"
        )

class AlreadyExistsException(CustomHTTPException):
    def __init__(self , detail: str = "Already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="ALREADY_EXISTS"
        )

class NotFoundException(CustomHTTPException):
    def __init__(self , detail: str = "Not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND"
        )

class InternalServerError(CustomHTTPException):
    def __init__(self , detail: str = "Internal Server Error"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INTERNAL_SERVER_ERROR"
        )

class DatabaseError(CustomHTTPException):
    def __init__(self, detail: str = "Database Operation Failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR"
        )

class ServiceUnavailableException(CustomHTTPException):
    def __init__(self, detail: str = "Service Unavailable"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="SERVICE_UNAVAILABLE"
        )