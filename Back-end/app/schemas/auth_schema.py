from pydantic import BaseModel , EmailStr , constr , validator , SecretStr , Field
from typing import Optional , Dict , Any
import re
from app.config.config import settings
from datetime import datetime
from enum import Enum

pw_validate = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$")


class UserSignUp(BaseModel):
    email : EmailStr
    password : constr(min_length=8) 
    confirm_password : constr(min_length=8)
    name : str

    @validator('password')
    def strong(cls , val):
        """
        Check if password is strong enough, i.e. it contains at least one
        uppercase letter, one lowercase letter, one digit and one special
        character.

        Raises a ValueError if the password is not strong enough.
        """
        if not pw_validate.match(val):
            raise ValueError("Password must contain atleast one uppercase letter , one lowercase letter , one digit and one special character.")
        return val

    @validator("confirm_password")
    def match(cls , val , values):
        """Check if confirm_password matches password."""
        if "password" in values and val != values["password"]:
            raise ValueError("passwords do not match")
        return val

    @validator("email")
    def domain_ok(cls, val):
        """
        Check if the email address is from an allowed domain.

        Raises a ValueError if the domain is not allowed.
        """
        if val.split("@")[-1] not in settings.email_allowed_domains:
            raise ValueError("e-mail domain not allowed")
        return val

class UserLogin(BaseModel):
    email : EmailStr
    password : constr(min_length=8)

    @validator("email", pre=True)
    def valid_email_login(cls,val):
        """
        Ensure that the email address is lowercased before validation.

        We use pre=True to ensure that this validation happens before the built-in
        EmailStr validation happens. This is because the built-in EmailStr validation
        is case-sensitive, and may raise a ValueError if the email address is not
        in lowercase.
        """
        return val.lower()

class Token(BaseModel):
    access_token : str
    refresh_token : str
    token_type : str = "bearer"
    expires_in : int
    # expires_in : Optional[int] = None
    require_2fa : bool = False

class ActivityType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    DELETE_ACCOUNT = "delete_account"
    SIGNUP = "signup"
    
class UserActivity(BaseModel):
    id : str
    user_id : str
    created_at : datetime = Field(default_factory=lambda : datetime.utcnow())
    activity_type :ActivityType
    ip_address : str
    activity_data : Dict[str , Any] = {}    

class User(BaseModel):
    user_id : str
    email : str
    name : Optional[str] = None
    created_at : datetime = Field(default_factory=lambda : datetime.utcnow())
    last_login : Optional[datetime] = None
    access_token : SecretStr


class AuthResponse(BaseModel):
    message : str

class updateUserProfile(BaseModel):
    name : Optional[str]
    avatar_url : Optional[str] = None
    phone_num : Optional[str] = None
    location : Optional[str] = None
    birthday : Optional[str] = None
    country: Optional[str] = None
    city_state: Optional[str] = None
    postal_code: Optional[str] = None
    organization_id : Optional[str] = None 

class changePassword(BaseModel):
    new_password : constr(min_length=8) 

class SSRequest(BaseModel):
    code: Optional[str] = None 

class SSResponse(BaseModel):
    ss: str

