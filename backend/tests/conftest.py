import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base
from app.core.dependencies import get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import hash_password, create_access_token

# Test database engine
# For isolated unit & integration tests, we use a dedicated test engine
# If settings.DATABASE_URL connects to PostgreSQL, we can use a test database or SQLite in-memory for lightning fast test suites
TEST_DB_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in test database once for the test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    """Yield a fresh isolated database session per test with automatic rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def test_student(db_session):
    """Create and return a test student user."""
    student = User(
        name="Test Student",
        email="student@exam.com",
        registration_number="STU-2026-000001",
        password_hash=hash_password("student123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    return student

@pytest.fixture
def test_examiner(db_session):
    """Create and return a test examiner user."""
    examiner = User(
        name="Test Examiner",
        email="examiner@exam.com",
        password_hash=hash_password("examiner123"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    db_session.add(examiner)
    db_session.commit()
    db_session.refresh(examiner)
    return examiner

@pytest.fixture
def test_admin(db_session):
    """Create and return a test admin user."""
    admin = User(
        name="Test Admin",
        email="admin@exam.com",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin

@pytest.fixture
def student_auth_headers(test_student):
    token = create_access_token({"sub": str(test_student.id), "email": test_student.email, "role": test_student.role.value})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def examiner_auth_headers(test_examiner):
    token = create_access_token({"sub": str(test_examiner.id), "email": test_examiner.email, "role": test_examiner.role.value})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_auth_headers(test_admin):
    token = create_access_token({"sub": str(test_admin.id), "email": test_admin.email, "role": test_admin.role.value})
    return {"Authorization": f"Bearer {token}"}
