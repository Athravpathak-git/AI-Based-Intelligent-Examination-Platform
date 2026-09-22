import random
import hashlib
from datetime import datetime, timezone
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.exam import Exam
from app.models.session import ExamSession
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.schemas.exam import PaperGenerateResponse
from app.schemas.question import QuestionStudentResponse, OptionStudentResponse

def ensure_utc(dt: datetime) -> datetime:
    if dt is None:
        return None
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def generate_paper_for_student(
    db: Session,
    exam_id: int,
    student_id: int,
    check_time_window: bool = True
) -> PaperGenerateResponse:
    """Deterministically generate an exam paper for a student."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    # Authoritative server-side time validation (only when starting an attempt)
    if check_time_window:
        current_time = datetime.now(timezone.utc)
        exam_start = ensure_utc(exam.start_time)
        exam_end = ensure_utc(exam.end_time)

        if current_time < exam_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam has not started yet."
            )
        if current_time > exam_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam window has ended."
            )

    # Check for previous attempts to detect reattempt flow
    past_attempts = (
        db.query(ExamSession)
        .filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == student_id,
            ExamSession.status.in_(["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"])
        )
        .count()
    )
    is_reattempt = past_attempts > 0

    # Deterministic seed calculation
    if exam.per_student_unique_paper:
        suffix = f":reattempt_{past_attempts}" if is_reattempt else ""
        seed_str = f"{exam.id}:{student_id}{suffix}"
    else:
        suffix = f":reattempt_{past_attempts}" if is_reattempt else ""
        seed_str = f"{exam.id}:shared{suffix}"
    
    seed_int = int(hashlib.sha256(seed_str.encode("utf-8")).hexdigest()[:16], 16)
    rng = random.Random(seed_int)

    selected_questions: List[QuestionBank] = []
    selected_ids = set()

    if exam.question_selection_rules:
        for rule in exam.question_selection_rules:
            query = db.query(QuestionBank).filter(QuestionBank.is_active == True)
            target_subject = rule.get("subject") or exam.subject
            query = query.filter(QuestionBank.subject == target_subject)

            if rule.get("topic"):
                query = query.filter(QuestionBank.topic.ilike(f"%{rule['topic'].strip()}%"))
            if rule.get("subtopic"):
                query = query.filter(QuestionBank.subtopic.ilike(f"%{rule['subtopic'].strip()}%"))
            if rule.get("difficulty"):
                query = query.filter(QuestionBank.difficulty == DifficultyLevel(rule["difficulty"]))
            if rule.get("question_type"):
                query = query.filter(QuestionBank.question_type == QuestionType(rule["question_type"]))

            # Never re-sample questions already selected across blueprint rules
            if selected_ids:
                query = query.filter(~QuestionBank.id.in_(list(selected_ids)))

            candidate_questions = query.order_by(QuestionBank.id.asc()).all()
            needed_count = rule.get("count", 0)

            if len(candidate_questions) < needed_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot generate paper: insufficient questions for rule {rule}."
                )

            if is_reattempt and not rule.get("difficulty"):
                # Prioritize HARD -> MEDIUM -> EASY
                hard_pool = [q for q in candidate_questions if q.difficulty == DifficultyLevel.HARD]
                med_pool = [q for q in candidate_questions if q.difficulty == DifficultyLevel.MEDIUM]
                easy_pool = [q for q in candidate_questions if q.difficulty == DifficultyLevel.EASY]
                rng.shuffle(hard_pool)
                rng.shuffle(med_pool)
                rng.shuffle(easy_pool)
                ordered_pool = hard_pool + med_pool + easy_pool
                sampled = ordered_pool[:needed_count]
            else:
                sampled = rng.sample(candidate_questions, needed_count)

            for s in sampled:
                selected_ids.add(s.id)
                selected_questions.append(s)
    else:
        candidates = (
            db.query(QuestionBank)
            .filter(QuestionBank.subject == exam.subject, QuestionBank.is_active == True)
            .all()
        )
        if len(candidates) < exam.total_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot generate paper: only {len(candidates)} questions available for subject '{exam.subject}'."
            )

        if is_reattempt:
            # Reattempt priority: 1. HARD, 2. MEDIUM, 3. EASY
            hard_pool = [q for q in candidates if q.difficulty == DifficultyLevel.HARD]
            med_pool = [q for q in candidates if q.difficulty == DifficultyLevel.MEDIUM]
            easy_pool = [q for q in candidates if q.difficulty == DifficultyLevel.EASY]
            rng.shuffle(hard_pool)
            rng.shuffle(med_pool)
            rng.shuffle(easy_pool)
            ordered_pool = hard_pool + med_pool + easy_pool
            selected_questions = ordered_pool[:exam.total_questions]
        else:
            candidates.sort(key=lambda q: q.id)
            selected_questions = rng.sample(candidates, exam.total_questions)

    # Validate paper invariants
    question_ids = [q.id for q in selected_questions]
    if len(question_ids) != exam.total_questions or len(set(question_ids)) != exam.total_questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integrity violation: Paper must contain exactly {exam.total_questions} unique questions, but generated {len(question_ids)} ({len(set(question_ids))} unique)."
        )

    # Randomize question order if enabled
    if exam.randomize_questions:
        rng.shuffle(selected_questions)

    # Build student-safe question representations
    student_question_list: List[QuestionStudentResponse] = []

    for q in selected_questions:
        # Fetch options deterministically ordered
        opts = (
            db.query(Option)
            .filter(Option.question_id == q.id)
            .order_by(Option.option_order.asc(), Option.id.asc())
            .all()
        )

        # Shuffle options if enabled
        if exam.randomize_options and opts:
            opts = list(opts)
            rng.shuffle(opts)

        # STRIP `is_correct` to ensure exam integrity
        safe_options = [
            OptionStudentResponse(
                id=opt.id,
                option_text=opt.option_text,
                option_order=idx
            )
            for idx, opt in enumerate(opts)
        ]

        student_question_list.append(
            QuestionStudentResponse(
                id=q.id,
                subject=q.subject,
                question_text=q.question_text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                marks=q.marks,
                options=safe_options
            )
        )

    return PaperGenerateResponse(
        exam_id=exam.id,
        exam_name=exam.name,
        subject=exam.subject,
        duration_minutes=exam.duration_minutes,
        total_questions=len(student_question_list),
        maximum_marks=exam.maximum_marks,
        start_time=exam.start_time,
        end_time=exam.end_time,
        student_id=student_id,
        questions=student_question_list
    )
