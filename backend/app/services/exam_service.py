from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.exam import Exam
from app.models.question import QuestionBank
from app.models.registration import ExamRegistration
from app.models.session import ExamSession
from app.models.user import User, UserRole
from app.models.student_profile import StudentProfile
from app.models.result import Result
from app.models.proctor import ProctorEvent
from app.schemas.exam import ExamCreate, ExamUpdate, QuestionSelectionRule
from app.services.paper_generator import ensure_utc
from app.services.notification_service import create_notification, create_bulk_notifications

def validate_exam_configuration(db: Session, exam_in: ExamCreate):
    """Validate exam configuration and question pool availability."""
    if exam_in.duration_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be greater than 0 minutes."
        )
    if exam_in.total_questions <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total questions must be greater than 0."
        )
    if exam_in.maximum_marks <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum marks must be greater than 0."
        )
    if exam_in.end_time <= exam_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam end_time must be strictly after start_time."
        )
    if exam_in.gaze_sensitivity < 0.0 or exam_in.gaze_sensitivity > 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gaze sensitivity must be between 0.0 and 1.0."
        )
    if exam_in.maximum_tab_switch_warnings < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum tab switch warnings cannot be negative."
        )

    # Validate Question Selection Rules if configured
    if exam_in.question_selection_rules:
        total_rule_questions = sum(rule.count for rule in exam_in.question_selection_rules)
        if total_rule_questions != exam_in.total_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Blueprint total must equal exam question count."
            )

        # Verify question bank pool sufficiency for each rule
        for rule in exam_in.question_selection_rules:
            query = db.query(QuestionBank).filter(QuestionBank.is_active == True)
            target_subject = rule.subject or exam_in.subject
            query = query.filter(QuestionBank.subject == target_subject)

            if rule.topic:
                query = query.filter(QuestionBank.topic.ilike(f"%{rule.topic.strip()}%"))
            if rule.subtopic:
                query = query.filter(QuestionBank.subtopic.ilike(f"%{rule.subtopic.strip()}%"))
            if rule.difficulty:
                query = query.filter(QuestionBank.difficulty == rule.difficulty)
            if rule.question_type:
                query = query.filter(QuestionBank.question_type == rule.question_type)

            available_count = query.count()
            if available_count < rule.count:
                desc = f"{target_subject}"
                if rule.topic:
                    desc += f" -> {rule.topic}"
                if rule.difficulty:
                    desc += f" ({rule.difficulty.value})"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient questions in Question Bank. Insufficient valid {desc} questions. Required: {rule.count}, Available: {available_count}."
                )
    else:
        available_count = db.query(QuestionBank).filter(QuestionBank.subject == exam_in.subject, QuestionBank.is_active == True).count()
        if available_count < exam_in.total_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient questions in Question Bank for subject '{exam_in.subject}'. Insufficient valid {exam_in.subject} questions. Required: {exam_in.total_questions}, Available: {available_count}."
            )

def create_exam(db: Session, exam_in: ExamCreate, creator_id: int) -> Exam:
    """Create a new exam with configuration rules."""
    validate_exam_configuration(db, exam_in)

    rules_dict = [r.model_dump() for r in exam_in.question_selection_rules] if exam_in.question_selection_rules else None

    db_exam = Exam(
        name=exam_in.name,
        subject=exam_in.subject,
        description=exam_in.description,
        duration_minutes=exam_in.duration_minutes,
        start_time=exam_in.start_time,
        end_time=exam_in.end_time,
        total_questions=exam_in.total_questions,
        maximum_marks=exam_in.maximum_marks,
        negative_marking_enabled=exam_in.negative_marking_enabled,
        negative_mark_value=exam_in.negative_mark_value or 0.0,
        randomize_questions=exam_in.randomize_questions,
        randomize_options=exam_in.randomize_options,
        per_student_unique_paper=exam_in.per_student_unique_paper,
        maximum_tab_switch_warnings=exam_in.maximum_tab_switch_warnings,
        webcam_monitoring_enabled=exam_in.webcam_monitoring_enabled,
        gaze_sensitivity=exam_in.gaze_sensitivity,
        question_selection_rules=rules_dict,
        created_by=creator_id
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)

    # 1. Notify the exam creator
    creator = db.query(User).filter(User.id == creator_id).first()
    creator_link = "/examiner/exams" if creator and creator.role == UserRole.EXAMINER else "/admin/exams"
    create_notification(
        db=db,
        user_id=creator_id,
        type="EXAM_SCHEDULED",
        title=f"Exam Scheduled: {db_exam.name}",
        message=f"Exam '{db_exam.name}' ({db_exam.subject}) has been successfully scheduled for {db_exam.duration_minutes} minutes.",
        link=creator_link
    )

    # 2. Notify all active students about the newly scheduled exam
    student_ids = [
        s.id for s in db.query(User.id).filter(User.role == UserRole.STUDENT, User.is_active == True).all()
    ]
    if student_ids:
        create_bulk_notifications(
            db=db,
            user_ids=student_ids,
            type="EXAM_SCHEDULED",
            title=f"New Exam Available: {db_exam.name}",
            message=f"A new examination '{db_exam.name}' ({db_exam.subject}) has been scheduled. Duration: {db_exam.duration_minutes} mins.",
            link="/student"
        )

    return db_exam

def update_exam(db: Session, exam_id: int, exam_in: ExamUpdate) -> Exam:
    """Update an exam configuration with historical integrity protection."""
    db_exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not db_exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    update_data = exam_in.model_dump(exclude_unset=True)

    # Protect historical integrity: prevent altering critical scoring parameters if attempts exist
    existing_sessions = db.query(ExamSession).filter(ExamSession.exam_id == exam_id).count()
    if existing_sessions > 0:
        critical_fields = {"subject", "total_questions", "maximum_marks", "negative_marking_enabled"}
        changing_critical = critical_fields.intersection(update_data.keys())
        if changing_critical:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify {', '.join(changing_critical)}: exam already has {existing_sessions} student attempt(s)."
            )

    if "question_selection_rules" in update_data and update_data["question_selection_rules"] is not None:
        update_data["question_selection_rules"] = [
            r.model_dump() if hasattr(r, "model_dump") else r for r in update_data["question_selection_rules"]
        ]

    for field, value in update_data.items():
        setattr(db_exam, field, value)

    db.commit()
    db.refresh(db_exam)

    if db_exam.created_by:
        create_notification(
            db=db,
            user_id=db_exam.created_by,
            type="EXAM_SCHEDULED",
            title=f"Exam Updated: {db_exam.name}",
            message=f"Configuration for exam '{db_exam.name}' has been updated.",
            link="/examiner/exams"
        )

    return db_exam

def delete_exam(db: Session, exam_id: int) -> bool:
    """Safely delete an exam. Uses soft-delete (archiving) if student sessions exist."""
    db_exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not db_exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    existing_sessions = db.query(ExamSession).filter(ExamSession.exam_id == exam_id).count()
    if existing_sessions > 0:
        db_exam.is_deleted = True
        db.commit()
        return True

    db.delete(db_exam)
    db.commit()
    return True

def register_student_for_exam(db: Session, exam_id: int, student: User) -> ExamRegistration:
    """Register a student for an upcoming exam."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    now = datetime.now(timezone.utc)
    if ensure_utc(exam.end_time) <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register for an exam whose end window has already passed."
        )

    existing = db.query(ExamRegistration).filter(
        ExamRegistration.exam_id == exam_id,
        ExamRegistration.student_id == student.id
    ).first()

    if existing:
        if existing.status == "REGISTERED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already registered for this exam."
            )
        else:
            existing.status = "REGISTERED"
            existing.registered_at = now
            db.commit()
            db.refresh(existing)

            # Notify student and creator
            create_notification(
                db=db,
                user_id=student.id,
                type="EXAM_REGISTERED",
                title=f"Registration Confirmed: {exam.name}",
                message=f"You have successfully registered for '{exam.name}'. Duration: {exam.duration_minutes} mins.",
                link="/student"
            )
            if exam.created_by:
                create_notification(
                    db=db,
                    user_id=exam.created_by,
                    type="EXAM_REGISTERED",
                    title=f"New Candidate Registration: {exam.name}",
                    message=f"Student {student.name} ({student.registration_number or student.email}) registered for '{exam.name}'.",
                    link="/examiner/exams"
                )

            return existing

    reg = ExamRegistration(
        exam_id=exam_id,
        student_id=student.id,
        status="REGISTERED"
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)

    # Notify student and creator
    create_notification(
        db=db,
        user_id=student.id,
        type="EXAM_REGISTERED",
        title=f"Registration Confirmed: {exam.name}",
        message=f"You have successfully registered for '{exam.name}'. Duration: {exam.duration_minutes} mins.",
        link="/student"
    )
    if exam.created_by:
        create_notification(
            db=db,
            user_id=exam.created_by,
            type="EXAM_REGISTERED",
            title=f"New Candidate Registration: {exam.name}",
            message=f"Student {student.name} ({student.registration_number or student.email}) registered for '{exam.name}'.",
            link="/examiner/exams"
        )

    return reg

def cancel_student_registration(db: Session, exam_id: int, student: User) -> bool:
    """Cancel a student's exam registration before the exam window begins."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    now = datetime.now(timezone.utc)
    if ensure_utc(exam.start_time) <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel registration after the exam start window has begun."
        )

    reg = db.query(ExamRegistration).filter(
        ExamRegistration.exam_id == exam_id,
        ExamRegistration.student_id == student.id,
        ExamRegistration.status == "REGISTERED"
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active exam registration not found."
        )

    reg.status = "CANCELLED"
    db.commit()
    return True

def get_student_registrations(db: Session, student_id: int) -> List[dict]:
    """Retrieve all active registrations for a given student."""
    registrations = (
        db.query(ExamRegistration, Exam)
        .join(Exam, ExamRegistration.exam_id == Exam.id)
        .filter(ExamRegistration.student_id == student_id, ExamRegistration.status == "REGISTERED")
        .order_by(Exam.start_time.asc())
        .all()
    )
    result = []
    for reg, ex in registrations:
        result.append({
            "id": reg.id,
            "exam_id": ex.id,
            "student_id": reg.student_id,
            "registered_at": reg.registered_at,
            "status": reg.status,
            "exam_name": ex.name,
            "subject": ex.subject,
            "start_time": ex.start_time,
            "end_time": ex.end_time,
            "duration_minutes": ex.duration_minutes,
            "is_registered": True
        })
    return result

def get_exam_candidates(db: Session, exam_id: int) -> List[dict]:
    """Retrieve registered candidates for an exam (Examiner / Admin view) with academic profile and attempt status."""
    candidates = (
        db.query(ExamRegistration, User, StudentProfile)
        .join(User, ExamRegistration.student_id == User.id)
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .filter(ExamRegistration.exam_id == exam_id)
        .order_by(ExamRegistration.registered_at.desc())
        .all()
    )
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    exam_name = exam.name if exam else ""
    exam_subject = exam.subject if exam else ""
    max_marks = exam.maximum_marks if exam else None

    now = datetime.now(timezone.utc)
    if exam:
        start_utc = ensure_utc(exam.start_time)
        end_utc = ensure_utc(exam.end_time)
        if now < start_utc:
            exam_status_str = "UPCOMING"
        elif now > end_utc:
            exam_status_str = "CLOSED"
        else:
            exam_status_str = "ACTIVE"
    else:
        exam_status_str = "ACTIVE"

    result = []
    for reg, user, profile in candidates:
        session = (
            db.query(ExamSession)
            .filter(ExamSession.exam_id == exam_id, ExamSession.student_id == user.id)
            .order_by(ExamSession.id.desc())
            .first()
        )
        attempt_status = session.status if session else "NOT_STARTED"
        score = None
        percentage = None
        result_status = None
        violations_count = 0

        if session:
            db_res = db.query(Result).filter(Result.session_id == session.id).first()
            if db_res:
                score = db_res.total_marks
                percentage = db_res.percentage
                result_status = db_res.status
            violations_count = db.query(ProctorEvent).filter(ProctorEvent.session_id == session.id).count()

        result.append({
            "id": reg.id,
            "student_id": user.id,
            "name": user.name,
            "email": user.email,
            "registration_number": user.registration_number,
            "mobile_number": profile.mobile_number if profile else None,
            "date_of_birth": profile.date_of_birth if profile else None,
            "gender": profile.gender if profile else None,
            "college": profile.college if profile else None,
            "university": profile.university if profile else None,
            "course": profile.course if profile else None,
            "specialization": profile.specialization if profile else None,
            "year_semester": profile.year_semester if profile else None,
            "enrollment_number": profile.enrollment_number if profile else None,
            "graduation_year": profile.graduation_year if profile else None,
            "city": profile.city if profile else None,
            "state": profile.state if profile else None,
            "country": profile.country if profile else None,
            "pin_code": profile.pin_code if profile else None,
            "is_active": user.is_active,
            "user_created_at": user.created_at,
            "exam_name": exam_name,
            "exam_subject": exam_subject,
            "exam_status": exam_status_str,
            "maximum_marks": max_marks,
            "registered_at": reg.registered_at,
            "status": reg.status,
            "attempt_status": attempt_status,
            "score": score,
            "percentage": percentage,
            "result_status": result_status,
            "proctoring_violations_count": violations_count
        })
    return result

def export_exam_candidates_csv(candidates: List[dict]) -> str:
    """Generate spreadsheet-compatible CSV string containing 28-column candidate roster."""
    import csv
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Registration Number",
        "Full Name (Candidate Name)",
        "Email",
        "Mobile Number",
        "DOB",
        "Gender",
        "College/Institute",
        "University",
        "Course",
        "Specialization",
        "Year/Semester",
        "Student/Enrollment Number",
        "Graduation Year",
        "City",
        "State",
        "Country",
        "PIN Code",
        "Account Status",
        "Registration Date",
        "Exam Name",
        "Exam Subject",
        "Exam Registration Date",
        "Exam Status",
        "Attempt Status",
        "Score",
        "Maximum Marks",
        "Percentage",
        "Result Status"
    ])
    for c in candidates:
        writer.writerow([
            c.get("registration_number") or "",
            c.get("name") or "",
            c.get("email") or "",
            c.get("mobile_number") or "",
            c.get("date_of_birth") or "",
            c.get("gender") or "",
            c.get("college") or "",
            c.get("university") or "",
            c.get("course") or "",
            c.get("specialization") or "",
            c.get("year_semester") or "",
            c.get("enrollment_number") or "",
            c.get("graduation_year") or "",
            c.get("city") or "",
            c.get("state") or "",
            c.get("country") or "",
            c.get("pin_code") or "",
            "ACTIVE" if c.get("is_active") else "INACTIVE",
            c.get("user_created_at").strftime("%Y-%m-%d") if hasattr(c.get("user_created_at"), "strftime") else str(c.get("user_created_at") or ""),
            c.get("exam_name") or "",
            c.get("exam_subject") or "",
            c.get("registered_at").strftime("%Y-%m-%d %H:%M:%S") if hasattr(c.get("registered_at"), "strftime") else str(c.get("registered_at") or ""),
            c.get("exam_status") or "ACTIVE",
            c.get("attempt_status") or "NOT_STARTED",
            c.get("score") if c.get("score") is not None else "N/A",
            c.get("maximum_marks") if c.get("maximum_marks") is not None else "N/A",
            f"{c.get('percentage')}%" if c.get("percentage") is not None else "N/A",
            c.get("result_status") or "PENDING"
        ])
    return output.getvalue()

def export_all_platform_candidates_csv(db: Session) -> str:
    """Platform-wide candidate roster export for administrators across all examinations."""
    exams = db.query(Exam).order_by(Exam.id.desc()).all()
    all_candidates = []
    for exam in exams:
        candidates = get_exam_candidates(db, exam.id)
        all_candidates.extend(candidates)
    return export_exam_candidates_csv(all_candidates)

