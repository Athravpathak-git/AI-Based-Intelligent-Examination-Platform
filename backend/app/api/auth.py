import secrets
import hashlib
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_admin, require_examiner_or_admin
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, UserRole
from app.models.student_profile import StudentProfile
from app.models.auth_token import PasswordResetToken
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    AdminCreateUser,
    AdminUpdateUser,
    UserProfileUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    GenericMessageResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_student_registration_number(db: Session) -> str:
    """Generate sequential unique student registration number: STU-YYYY-XXXXXX"""
    year = datetime.now(timezone.utc).year
    prefix = f"STU-{year}-"
    highest_user = (
        db.query(User.registration_number)
        .filter(User.registration_number.like(f"{prefix}%"))
        .order_by(User.registration_number.desc())
        .first()
    )
    if highest_user and highest_user[0]:
        try:
            last_seq = int(highest_user[0].split("-")[-1])
            new_seq = last_seq + 1
        except ValueError:
            new_seq = 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:06d}"

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Public student registration endpoint.
    Strictly restricts public registration to STUDENT role only.
    Examiner and Admin accounts must be provisioned by an Administrator.
    """
    if user_in.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is strictly restricted to STUDENT role. Examiner and Admin accounts must be provisioned by an Administrator."
        )

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    reg_num = generate_student_registration_number(db)

    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=UserRole.STUDENT,
        registration_number=reg_num
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Attach student profile with personal, academic, and address details
    profile = StudentProfile(
        user_id=db_user.id,
        date_of_birth=user_in.date_of_birth,
        gender=user_in.gender,
        mobile_number=user_in.mobile_number,
        profile_photo_url=user_in.profile_photo_url,
        college=user_in.college,
        university=user_in.university,
        course=user_in.course,
        specialization=user_in.specialization,
        year_semester=user_in.year_semester,
        enrollment_number=user_in.enrollment_number,
        graduation_year=user_in.graduation_year,
        address=user_in.address,
        city=user_in.city,
        state=user_in.state,
        country=user_in.country or "India",
        pin_code=user_in.pin_code
    )
    db.add(profile)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    user_in: AdminCreateUser,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """
    Administrator endpoint to provision Examiner, Student, or Admin accounts.
    Requires ADMIN authorization.
    """
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    reg_num = None
    if user_in.role == UserRole.STUDENT:
        reg_num = generate_student_registration_number(db)

    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        registration_number=reg_num
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    if user_in.role == UserRole.STUDENT:
        profile = StudentProfile(
            user_id=db_user.id,
            date_of_birth=user_in.date_of_birth,
            gender=user_in.gender,
            mobile_number=user_in.mobile_number,
            college=user_in.college,
            university=user_in.university,
            course=user_in.course,
            specialization=user_in.specialization,
            year_semester=user_in.year_semester,
            enrollment_number=user_in.enrollment_number,
            graduation_year=user_in.graduation_year,
            address=user_in.address,
            city=user_in.city,
            state=user_in.state,
            country=user_in.country or "India",
            pin_code=user_in.pin_code
        )
        db.add(profile)
        db.commit()
        db.refresh(db_user)

    return db_user

@router.put("/admin/users/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    user_update: AdminUpdateUser,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Administrator endpoint to edit user information (Examiner, Student, Admin)."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_update.name is not None:
        target_user.name = user_update.name
    if user_update.email is not None:
        existing = db.query(User).filter(User.email == user_update.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email address already exists.")
        target_user.email = user_update.email
    if user_update.is_active is not None:
        target_user.is_active = user_update.is_active
    if user_update.password is not None:
        target_user.password_hash = hash_password(user_update.password)

    db.commit()
    db.refresh(target_user)
    return target_user

@router.get("/admin/students/{student_id}", response_model=UserResponse)
def admin_get_student_details(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Administrator endpoint to view complete candidate details (academic, personal, address)."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials (STUDENT, EXAMINER, ADMIN) and return a JWT access token."""
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        name=user.name,
        registration_number=user.registration_number
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile of currently authenticated user."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Safely update profile fields. Blocks changing role or registration number."""
    current_user.name = profile_in.name

    if current_user.role == UserRole.STUDENT:
        prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not prof:
            prof = StudentProfile(user_id=current_user.id)
            db.add(prof)

        if profile_in.date_of_birth is not None: prof.date_of_birth = profile_in.date_of_birth
        if profile_in.gender is not None: prof.gender = profile_in.gender
        if profile_in.mobile_number is not None: prof.mobile_number = profile_in.mobile_number
        if profile_in.profile_photo_url is not None: prof.profile_photo_url = profile_in.profile_photo_url
        if profile_in.college is not None: prof.college = profile_in.college
        if profile_in.university is not None: prof.university = profile_in.university
        if profile_in.course is not None: prof.course = profile_in.course
        if profile_in.specialization is not None: prof.specialization = profile_in.specialization
        if profile_in.year_semester is not None: prof.year_semester = profile_in.year_semester
        if profile_in.enrollment_number is not None: prof.enrollment_number = profile_in.enrollment_number
        if profile_in.graduation_year is not None: prof.graduation_year = profile_in.graduation_year
        if profile_in.address is not None: prof.address = profile_in.address
        if profile_in.city is not None: prof.city = profile_in.city
        if profile_in.state is not None: prof.state = profile_in.state
        if profile_in.country is not None: prof.country = profile_in.country
        if profile_in.pin_code is not None: prof.pin_code = profile_in.pin_code

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/admin/users", response_model=List[UserResponse])
def admin_list_users(
    role: Optional[UserRole] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Administrator endpoint to list users filtered by role."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.id.desc()).all()

@router.get("/students", response_model=List[UserResponse])
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Endpoint for examiners and admins to list active students for exam management and re-attempt permissions."""
    return db.query(User).filter(User.role == UserRole.STUDENT, User.is_active == True).order_by(User.name.asc()).all()

@router.post("/forgot-password", response_model=GenericMessageResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate single-use password reset flow.
    Returns generic response to prevent user enumeration attacks.
    """
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    debug_tok = None
    if user:
        raw_token = secrets.token_urlsafe(32)
        tok_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=tok_hash,
            expires_at=expires
        )
        db.add(reset_record)
        db.commit()
        debug_tok = raw_token

    return GenericMessageResponse(
        message="If an account exists for this information, password reset instructions have been sent.",
        debug_token=debug_tok
    )

@router.post("/reset-password", response_model=GenericMessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset account password using valid single-use expiring token."""
    tok_hash = hashlib.sha256(req.token.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    reset_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == tok_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now
        )
        .first()
    )
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used password reset token."
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.password_hash = hash_password(req.new_password)
    reset_record.used_at = now
    db.commit()

    return GenericMessageResponse(message="Password changed successfully.")

@router.post("/change-password", response_model=GenericMessageResponse)
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Authenticated endpoint for Student, Examiner, or Admin to change password."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    current_user.password_hash = hash_password(req.new_password)
    db.commit()

    return GenericMessageResponse(message="Password changed successfully.")

@router.put("/admin/users/{user_id}/status", response_model=UserResponse)
def admin_toggle_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Administrator endpoint to activate or deactivate a user with last active admin protection."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not is_active and target_user.role == UserRole.ADMIN:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active Administrator account."
            )

    target_user.is_active = is_active
    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Administrator endpoint to safely deactivate/delete a user preserving historical records."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.role == UserRole.ADMIN:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last active Administrator account."
            )

    target_user.is_active = False
    db.commit()
    return {"message": f"User {target_user.name} ({target_user.email}) has been safely deactivated."}
