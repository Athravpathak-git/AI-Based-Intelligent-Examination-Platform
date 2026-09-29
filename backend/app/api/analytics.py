from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.dependencies import (
    get_db,
    get_current_user,
    require_student,
    require_examiner,
    require_admin,
    require_examiner_or_admin
)
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.question import QuestionBank
from app.models.result import Result
from app.models.session import ExamSession
from app.models.registration import ExamRegistration
from app.services.paper_generator import ensure_utc

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/student")
def api_get_student_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
) -> Dict[str, Any]:
    """Retrieve real performance metrics and score history for the authenticated student."""
    results = db.query(Result).filter(Result.student_id == current_user.id).all()
    total_attempts = len(results)
    avg_score = round(sum(r.percentage for r in results) / total_attempts, 1) if total_attempts > 0 else 0.0
    best_score = round(max((r.percentage for r in results), default=0.0), 1)

    # Subject performance
    subject_map: Dict[str, List[float]] = {}
    for r in results:
        sub = r.exam.subject if r.exam else "General"
        subject_map.setdefault(sub, []).append(r.percentage)

    subject_breakdown = [
        {"subject": sub, "average_percentage": round(sum(scores) / len(scores), 1), "tests_taken": len(scores)}
        for sub, scores in subject_map.items()
    ]

    # Recent results timeline
    history = [
        {
            "result_id": r.id,
            "exam_name": r.exam.name if r.exam else "Assessment",
            "subject": r.exam.subject if r.exam else "",
            "percentage": r.percentage,
            "date": r.created_at.strftime("%Y-%m-%d") if r.created_at else ""
        }
        for r in sorted(results, key=lambda x: x.created_at, reverse=True)[:5]
    ]

    return {
        "total_attempts": total_attempts,
        "average_score": avg_score,
        "best_score": best_score,
        "passed_exams": sum(1 for r in results if (r.status == "PASSED" if r.status in ["PASSED", "FAILED"] else r.percentage >= 50.0)),
        "failed_exams": sum(1 for r in results if (r.status == "FAILED" if r.status in ["PASSED", "FAILED"] else r.percentage < 50.0)),
        "subject_breakdown": subject_breakdown,
        "history": history
    }

@router.get("/examiner")
def api_get_examiner_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
) -> Dict[str, Any]:
    """Retrieve examiner metrics from actual database records."""
    now = datetime.now(timezone.utc)
    exams = db.query(Exam).all()
    total_exams = len(exams)
    active_exams = sum(1 for e in exams if ensure_utc(e.start_time) <= now <= ensure_utc(e.end_time))
    upcoming_exams = sum(1 for e in exams if ensure_utc(e.start_time) > now)
    completed_exams = sum(1 for e in exams if ensure_utc(e.end_time) < now)

    total_questions = db.query(QuestionBank).count()
    total_candidates = db.query(ExamRegistration.student_id).distinct().count()

    results = db.query(Result).all()
    total_results = len(results)
    avg_perf = round(sum(r.percentage for r in results) / total_results, 1) if total_results > 0 else 0.0
    highest_score = round(max((r.percentage for r in results), default=0.0), 1)
    lowest_score = round(min((r.percentage for r in results), default=0.0), 1)

    return {
        "total_exams": total_exams,
        "active_exams": active_exams,
        "upcoming_exams": upcoming_exams,
        "completed_exams": completed_exams,
        "total_questions": total_questions,
        "registered_candidates": total_candidates,
        "average_performance": avg_perf,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "total_evaluations": total_results
    }

@router.get("/admin")
def api_get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """Retrieve platform-wide operational and performance statistics."""
    now = datetime.now(timezone.utc)
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_examiners = db.query(User).filter(User.role == UserRole.EXAMINER).count()
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN).count()

    exams = db.query(Exam).all()
    total_exams = len(exams)
    active_exams = sum(1 for e in exams if ensure_utc(e.start_time) <= now <= ensure_utc(e.end_time))
    completed_exams = sum(1 for e in exams if ensure_utc(e.end_time) < now)

    total_questions = db.query(QuestionBank).count()
    total_attempts = db.query(ExamSession).count()

    results = db.query(Result).all()
    global_avg = round(sum(r.percentage for r in results) / len(results), 1) if results else 0.0

    return {
        "total_students": total_students,
        "total_examiners": total_examiners,
        "total_admins": total_admins,
        "total_exams": total_exams,
        "active_exams": active_exams,
        "completed_exams": completed_exams,
        "total_questions": total_questions,
        "total_attempts": total_attempts,
        "global_average": global_avg
    }
