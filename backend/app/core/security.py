from datetime import datetime, timedelta, timezone
from typing import Any, Union
import bcrypt
import jwt
from app.core.config import settings

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict[str, Any], expires_delta: Union[timedelta, None] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid or expired token: {str(e)}")

def create_exam_access_token(
    exam_id: int,
    student_id: int,
    session_id: int,
    duration_minutes: int
) -> str:
    """Create a signed JWT exam access token bound to exam, student, and session."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=duration_minutes)
    payload = {
        "exam_id": exam_id,
        "student_id": student_id,
        "session_id": session_id,
        "type": "exam_access",
        "exp": expire,
        "iat": now
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_exam_access_token(
    token: str,
    exam_id: Union[int, None] = None,
    student_id: Union[int, None] = None,
    session_id: Union[int, None] = None
) -> dict[str, Any]:
    """Verify and validate a signed JWT exam access token.
    Enforces expiry, signature, token type, and binding to exam_id, student_id, and session_id.
    Raises ValueError with descriptive message on any mismatch or failure.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("Exam access token has expired.")
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid exam access token signature: {str(e)}")

    if payload.get("type") != "exam_access":
        raise ValueError("Invalid token type: expected exam_access token.")

    if exam_id is not None and payload.get("exam_id") != exam_id:
        raise ValueError(f"Exam ID mismatch: token is bound to exam {payload.get('exam_id')}, got {exam_id}.")

    if student_id is not None and payload.get("student_id") != student_id:
        raise ValueError(f"Student ID mismatch: token is bound to student {payload.get('student_id')}, got {student_id}.")

    if session_id is not None and payload.get("session_id") != session_id:
        raise ValueError(f"Session ID mismatch: token is bound to session {payload.get('session_id')}, got {session_id}.")

    return payload

