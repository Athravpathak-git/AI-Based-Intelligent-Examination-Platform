# AI-Based Intelligent Examination Platform

**Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis**

Built with **FastAPI** (Python), **PostgreSQL 17**, **SQLAlchemy ORM**, **Alembic Migrations**, and **Next.js 14** (React, TypeScript, Tailwind CSS).

---

## 📌 Implementation Scope Status

- **Week 1 (COMPLETED & VERIFIED)**:
  - PostgreSQL schema design (`users`, `question_bank`, `options`, `exams`, `exam_questions`, and foundational `exam_sessions`, `answers`, `results`, `proctor_events`).
  - SQLAlchemy 2.0 ORM with typed models and cascade rules.
  - Alembic migrations configuration and schema versioning.
  - Secure bcrypt password hashing and JWT access tokens.
  - Role-based authorization: `STUDENT`, `EXAMINER`, `ADMIN` with route dependency guards.
  - Question Bank CRUD APIs with MCQ single-answer and Multi-Select validation, and multi-attribute filtering.
  - Full automated pytest suite with 100% passing tests.

- **Week 2 (COMPLETED & VERIFIED)**:
  - Exam creation and configuration API with validation rules (duration, question counts, maximum marks, timing windows).
  - Question selection breakdown quotas with bank shortage detection and clear error reporting.
  - Deterministic randomized paper generation using SHA-256 seed derived from `exam_id + student_id`.
  - Strict server-authoritative start and end timing window enforcement.
  - Question order and option shuffling while obfuscating correct answer identity (`is_correct`) from students.
  - Functional Next.js App Router frontend for Students, Examiners, and Administrators.

- **Weeks 3–8 (INTENTIONALLY NOT IMPLEMENTED YET)**:
  - Full automated MediaPipe face/gaze proctoring engine, APScheduler server-side auto-submit countdown, OCR, AI subjective LLM grading, and advanced analytics belong strictly to Week 3+ and their foundational database schemas are ready for seamless integration.

---

## 🏗️ Architecture & Project Structure

```text
AI_Examination_Platform/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application factory, CORS, /health
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings reading .env
│   │   │   ├── security.py             # Bcrypt hashing & PyJWT token utilities
│   │   │   └── dependencies.py         # DB session & RBAC role guards
│   │   ├── db/
│   │   │   ├── database.py             # SQLAlchemy engine & sessionmaker
│   │   │   └── base.py                 # Declarative Base exporting all models
│   │   ├── models/                     # User, QuestionBank, Option, Exam, ExamQuestion...
│   │   ├── schemas/                    # Pydantic v2 validation models
│   │   ├── api/                        # /api/auth, /api/questions, /api/exams
│   │   └── services/                   # Business logic: exam rules, paper generator
│   ├── alembic/                        # Database migration scripts
│   ├── scripts/                        # Database initialization, password config, seed data
│   ├── tests/                          # 25+ automated pytest tests
│   ├── requirements.txt                # Python backend dependencies
│   ├── alembic.ini
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with AuthProvider & Navbar
│   │   ├── page.tsx                    # Landing page
│   │   ├── login/                      # Login portal
│   │   ├── register/                   # Candidate & staff registration
│   │   ├── student/                    # Student exam portal & paper generator
│   │   ├── examiner/                   # Examiner dashboard, question bank, exam config
│   │   └── admin/                      # Administrator status console
│   ├── components/                     # Reusable UI components, Modals, Navbar
│   ├── lib/                            # Axios API client & AuthContext
│   ├── types/                          # Shared TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### 1. Configure Local Database Credentials

1. Open `backend/.env` (or copy from `backend/.env.example`).
2. Replace `YOUR_PASSWORD` with your local PostgreSQL password:
   ```env
   DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/ai_exam_db
   JWT_SECRET_KEY=exam_platform_super_secret_jwt_key_2026_production_grade_32bytes
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ```
   *Security Note: Never commit `.env` or share your password.*

3. Alternatively, run the secure helper script in PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File backend\scripts\set_db_password.ps1
   ```

### 2. Initialize Database & Run Alembic Migrations

Once your password is set in `backend/.env`:
```powershell
# Create database ai_exam_db
backend\.venv\Scripts\python -m scripts.init_db

# Run Alembic migrations
backend\.venv\Scripts\alembic upgrade head

# (Optional) Seed realistic sample questions & demo accounts
backend\.venv\Scripts\python -m scripts.seed_data
```

### 3. Run Backend Tests

```powershell
backend\.venv\Scripts\pytest -v
```
All 25 tests verify authentication, MCQ/Multi-select constraints, exam configuration, deterministic randomization, and time windows.

### 4. Start the FastAPI Backend

```powershell
backend\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Health Check: `http://127.0.0.1:8000/health`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc Documentation: `http://127.0.0.1:8000/redoc`

### 5. Start the Next.js Frontend

In a separate terminal:
```powershell
cd frontend
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Email | Password | Access |
|---|---|---|---|
| **Examiner** | `examiner@exam.com` | `examiner123` | Question Bank & Exam Configuration |
| **Student** | `student@exam.com` | `student123` | Exam Portal & Paper Generator |
| **Admin** | `admin@exam.com` | `admin123` | Platform Health & Management |
