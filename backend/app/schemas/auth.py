from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from app.models.user import UserRole

class StudentProfileCreate(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    year_semester: Optional[str] = None
    enrollment_number: Optional[str] = None
    graduation_year: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pin_code: Optional[str] = None

class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    year_semester: Optional[str] = None
    enrollment_number: Optional[str] = None
    graduation_year: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pin_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.STUDENT

    # Personal Information
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    profile_photo_url: Optional[str] = None

    # Academic Information
    college: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    year_semester: Optional[str] = None
    enrollment_number: Optional[str] = None
    graduation_year: Optional[int] = None

    # Address Information
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pin_code: Optional[str] = None

class AdminCreateUser(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole

    # Optional Student Profile fields if role is STUDENT
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    year_semester: Optional[str] = None
    enrollment_number: Optional[str] = None
    graduation_year: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pin_code: Optional[str] = None

class AdminUpdateUser(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    registration_number: Optional[str] = None

class UserProfileUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    # Student profile fields can be updated by student
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    year_semester: Optional[str] = None
    enrollment_number: Optional[str] = None
    graduation_year: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pin_code: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    registration_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    student_profile: Optional[StudentProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)

class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    old_password: Optional[str] = None
    new_password: str = Field(..., min_length=6, max_length=100)
    confirm_password: Optional[str] = None

    @model_validator(mode="after")
    def resolve_password(self):
        pwd = self.current_password or self.old_password
        if not pwd:
            raise ValueError("Either current_password or old_password must be provided.")
        self.current_password = pwd
        if self.confirm_password and self.confirm_password != self.new_password:
            raise ValueError("New password and confirm password do not match.")
        return self


class GenericMessageResponse(BaseModel):
    message: str
    debug_token: Optional[str] = None

