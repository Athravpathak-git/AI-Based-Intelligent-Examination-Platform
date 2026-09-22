import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.models.exam import Exam
from app.core.security import hash_password

def seed_database():
    db: Session = SessionLocal()
    try:
        print("[*] Checking for existing seed data...")
        examiner = db.query(User).filter(User.email == "examiner@exam.com").first()
        student_user = db.query(User).filter(User.email == "student@exam.com").first()
        if student_user and not student_user.registration_number:
            from app.api.auth import generate_student_registration_number
            student_user.registration_number = generate_student_registration_number(db)
            db.commit()

        if not examiner:
            print("[+] Creating demo users...")
            examiner = User(
                name="Prof. Sarah Jenkins",
                email="examiner@exam.com",
                password_hash=hash_password("examiner123"),
                role=UserRole.EXAMINER,
                is_active=True
            )
            student = User(
                name="Alex Walker",
                email="student@exam.com",
                password_hash=hash_password("student123"),
                role=UserRole.STUDENT,
                registration_number="STU-2026-000001",
                is_active=True
            )
            admin = User(
                name="System Administrator",
                email="admin@exam.com",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add_all([examiner, student, admin])
            db.commit()
            db.refresh(examiner)
            print("[+] Demo users created (examiner@exam.com, student@exam.com, admin@exam.com).")

        # Check questions count
        q_count = db.query(QuestionBank).count()
        if q_count < 10:
            print("[+] Seeding sample questions in Question Bank...")
            questions_data = [
                # Math MCQs
                {
                    "subject": "Mathematics",
                    "question_text": "What is the derivative of f(x) = x^3 with respect to x?",
                    "question_type": QuestionType.MCQ,
                    "difficulty": DifficultyLevel.EASY,
                    "marks": 2.0,
                    "negative_marks": 0.5,
                    "options": [
                        {"option_text": "3x^2", "is_correct": True, "option_order": 0},
                        {"option_text": "3x", "is_correct": False, "option_order": 1},
                        {"option_text": "x^2", "is_correct": False, "option_order": 2},
                        {"option_text": "6x", "is_correct": False, "option_order": 3},
                    ]
                },
                {
                    "subject": "Mathematics",
                    "question_text": "What is the value of the integral ∫(2x) dx from 0 to 3?",
                    "question_type": QuestionType.MCQ,
                    "difficulty": DifficultyLevel.MEDIUM,
                    "marks": 3.0,
                    "negative_marks": 1.0,
                    "options": [
                        {"option_text": "9", "is_correct": True, "option_order": 0},
                        {"option_text": "6", "is_correct": False, "option_order": 1},
                        {"option_text": "12", "is_correct": False, "option_order": 2},
                        {"option_text": "18", "is_correct": False, "option_order": 3},
                    ]
                },
                {
                    "subject": "Mathematics",
                    "question_text": "Which of the following are eigenvalues of the 2x2 identity matrix?",
                    "question_type": QuestionType.MULTI_SELECT,
                    "difficulty": DifficultyLevel.MEDIUM,
                    "marks": 3.0,
                    "negative_marks": 1.0,
                    "options": [
                        {"option_text": "λ = 1 (algebraic multiplicity 1)", "is_correct": True, "option_order": 0},
                        {"option_text": "λ = 1 (geometric multiplicity 2)", "is_correct": True, "option_order": 1},
                        {"option_text": "λ = 0", "is_correct": False, "option_order": 2},
                        {"option_text": "λ = -1", "is_correct": False, "option_order": 3},
                    ]
                },
                {
                    "subject": "Mathematics",
                    "question_text": "State and prove the Mean Value Theorem for a continuous function on [a, b].",
                    "question_type": QuestionType.LONG_ANSWER,
                    "difficulty": DifficultyLevel.HARD,
                    "marks": 10.0,
                    "negative_marks": 0.0,
                    "expected_answer": "f'(c) = (f(b) - f(a)) / (b - a)",
                    "model_answer": "If f is continuous on [a, b] and differentiable on (a, b), there exists at least one c in (a, b) such that f'(c) = (f(b) - f(a)) / (b - a)."
                },
                {
                    "subject": "Mathematics",
                    "question_text": "Solve the system: 2x + y = 7 and x - y = 2.",
                    "question_type": QuestionType.SHORT_ANSWER,
                    "difficulty": DifficultyLevel.EASY,
                    "marks": 2.0,
                    "negative_marks": 0.0,
                    "expected_answer": "x = 3, y = 1",
                    "model_answer": "Adding equations gives 3x = 9 => x = 3. Substituting into second yields y = 1."
                },
                {
                    "subject": "Mathematics",
                    "question_text": "Upload handwritten solution calculating the volume of revolution of y = √x from x = 0 to 4 around the x-axis.",
                    "question_type": QuestionType.IMAGE_UPLOAD,
                    "difficulty": DifficultyLevel.MEDIUM,
                    "marks": 5.0,
                    "negative_marks": 0.0,
                    "expected_answer": "V = π ∫(√x)^2 dx = 8π",
                    "model_answer": "Using disk method: V = π ∫ x dx = π [x^2 / 2] from 0 to 4 = 8π cubic units."
                },
                # Computer Science Questions
                {
                    "subject": "Computer Science",
                    "question_text": "Which of the following database engines support native JSON or JSONB document storage?",
                    "question_type": QuestionType.MULTI_SELECT,
                    "difficulty": DifficultyLevel.EASY,
                    "marks": 2.0,
                    "negative_marks": 0.5,
                    "options": [
                        {"option_text": "PostgreSQL", "is_correct": True, "option_order": 0},
                        {"option_text": "MySQL (from 5.7+)", "is_correct": True, "option_order": 1},
                        {"option_text": "SQLite (JSON1 extension)", "is_correct": True, "option_order": 2},
                        {"option_text": "Plain Text CSV", "is_correct": False, "option_order": 3},
                    ]
                },
                {
                    "subject": "Computer Science",
                    "question_text": "What is the average time complexity of searching an element in a balanced Binary Search Tree (AVL / Red-Black)?",
                    "question_type": QuestionType.MCQ,
                    "difficulty": DifficultyLevel.MEDIUM,
                    "marks": 2.0,
                    "negative_marks": 0.5,
                    "options": [
                        {"option_text": "O(log n)", "is_correct": True, "option_order": 0},
                        {"option_text": "O(n)", "is_correct": False, "option_order": 1},
                        {"option_text": "O(1)", "is_correct": False, "option_order": 2},
                        {"option_text": "O(n log n)", "is_correct": False, "option_order": 3},
                    ]
                }
            ]

            for q in questions_data:
                opts = q.pop("options", [])
                db_q = QuestionBank(**q, created_by=examiner.id)
                db.add(db_q)
                db.flush()
                for o in opts:
                    db.add(Option(question_id=db_q.id, **o))
            db.commit()
            print(f"[+] Added {len(questions_data)} sample questions.")

        # Seed sample active exam
        exam = db.query(Exam).filter(Exam.name == "Calculus & Linear Algebra Midterm").first()
        if not exam:
            now = datetime.now(timezone.utc)
            start_window = now - timedelta(hours=1)
            end_window = now + timedelta(hours=23)
            exam = Exam(
                name="Calculus & Linear Algebra Midterm",
                subject="Mathematics",
                duration_minutes=45,
                start_time=start_window,
                end_time=end_window,
                total_questions=4,
                maximum_marks=17.0,
                negative_marking_enabled=True,
                randomize_questions=True,
                randomize_options=True,
                per_student_unique_paper=True,
                maximum_tab_switch_warnings=3,
                webcam_monitoring_enabled=True,
                gaze_sensitivity=0.6,
                created_by=examiner.id
            )
            db.add(exam)
            db.commit()
            print("[+] Sample active exam created.")

        print("[+] Seed data completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
