from typing import List, Optional, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.dependencies import (
    get_db,
    get_current_user,
    require_student,
    require_examiner_or_admin
)
from app.models.user import User, UserRole
from app.models.result import Result
from app.models.exam import Exam
from app.models.session import ExamSession, Answer
from app.models.question import QuestionBank, QuestionType
from app.schemas.session import (
    ExamSubmissionResult,
    QuestionResultBreakdown,
    ReviewResultRequest
)
from app.services.report_service import generate_student_result_pdf, export_results_csv
from app.services.notification_service import create_notification
from app.services.question_translations import get_question_translations

router = APIRouter(prefix="/results", tags=["Results"])

def build_result_submission_response(db: Session, result: Result, requester: Optional[User] = None) -> ExamSubmissionResult:
    """Helper to reconstruct detailed score breakdown for a Result.
    Strictly conceals marks, percentages, pass/fail, and question answers from students
    until the result is officially PUBLISHED.
    """
    exam = result.exam
    student = result.student
    session = result.session

    eval_status = getattr(result, "evaluation_status", None) or "SUBMITTED"
    is_student = requester is not None and requester.role == UserRole.STUDENT
    is_published = eval_status == "PUBLISHED"

    # Get exam questions associated with the exam
    from app.services.paper_generator import generate_paper_for_student
    paper = generate_paper_for_student(db, exam.id, student.id, check_time_window=False)
    paper_q_ids = [q.id for q in paper.questions]

    # Reconstruct breakdown from saved answers
    answers = db.query(Answer).filter(Answer.session_id == result.session_id).all() if session else []
    ans_map = {a.question_id: a for a in answers}

    for ans_qid in ans_map.keys():
        if ans_qid not in paper_q_ids:
            paper_q_ids.append(ans_qid)
    questions_map = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all()}

    breakdown: List[QuestionResultBreakdown] = []
    attempted = 0
    correct = 0
    incorrect = 0
    neg_total = 0.0

    for q_id in paper_q_ids:
        q = questions_map.get(q_id)
        if not q:
            continue
        ans = ans_map.get(q_id)
        is_att = ans is not None and (bool(ans.selected_option_ids) or bool(ans.answer_text) or bool(ans.image_path))
        correct_ids = [o.id for o in q.options if o.is_correct]
        is_corr = False
        marks_awarded = ans.marks_awarded if ans and ans.marks_awarded is not None else 0.0
        neg_ded = 0.0

        if is_att:
            attempted += 1
            if marks_awarded > 0:
                is_corr = True
                correct += 1
            else:
                incorrect += 1
                if marks_awarded < 0:
                    neg_ded = abs(marks_awarded)
                    neg_total += neg_ded

        is_eval = False
        if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            is_eval = True
        elif ans and (getattr(ans, "is_evaluated", False) or ans.marks_awarded is not None):
            is_eval = True

        if is_student and not is_published:
            # Mask question-level marks and answers before publication
            breakdown.append(QuestionResultBreakdown(
                question_id=q.id,
                question_text=q.question_text,
                question_type=q.question_type.value,
                marks_possible=q.marks,
                marks_awarded=0.0,
                negative_marks_deducted=0.0,
                is_correct=False,
                is_attempted=is_att,
                is_marked_for_review=bool(ans.is_marked_for_review) if ans else False,
                is_evaluated=is_eval,
                selected_option_ids=ans.selected_option_ids if ans else None,
                correct_option_ids=None,
                student_text_answer=ans.answer_text if ans else None,
                image_path=ans.image_path if ans else None,
                thumbnail_path=getattr(ans, "thumbnail_path", None) if ans else None,
                ocr_text=None,
                ai_suggested_marks=None,
                ai_justification=None,
                ai_evaluation=None,
                model_answer=None,
                explanation=None,
                evaluator_feedback=None,
                translations=get_question_translations(q.question_text)
            ))
        else:
            breakdown.append(QuestionResultBreakdown(
                question_id=q.id,
                question_text=q.question_text,
                question_type=q.question_type.value,
                marks_possible=q.marks,
                marks_awarded=marks_awarded,
                negative_marks_deducted=neg_ded,
                is_correct=is_corr,
                is_attempted=is_att,
                is_marked_for_review=bool(ans.is_marked_for_review) if ans else False,
                is_evaluated=is_eval,
                selected_option_ids=ans.selected_option_ids if ans else None,
                correct_option_ids=correct_ids,
                student_text_answer=ans.answer_text if ans else None,
                image_path=ans.image_path if ans else None,
                thumbnail_path=getattr(ans, "thumbnail_path", None) if ans else None,
                ocr_text=getattr(ans, "ocr_text", None) if ans else None,
                ai_suggested_marks=getattr(ans, "ai_suggested_marks", None) if ans else None,
                ai_justification=getattr(ans, "ai_justification", None) if ans else None,
                ai_evaluation=getattr(ans, "ai_evaluation", None) if ans else None,
                model_answer=q.model_answer or q.expected_answer,
                explanation=q.explanation,
                evaluator_feedback=getattr(ans, "evaluator_feedback", None) if ans else None,
                translations=get_question_translations(q.question_text)
            ))

    unanswered = len(paper_q_ids) - attempted
    if result.status in ["PASSED", "FAILED"]:
        passed = (result.status == "PASSED")
    else:
        passed = result.percentage >= 50.0

    sub_status = "AUTO SUBMITTED" if session and session.status in ["SUBMITTED_VIOLATION", "TIME_EXPIRED", "EXPIRED"] else "SUBMITTED"
    sub_reason = "Maximum proctoring violations reached" if session and session.status == "SUBMITTED_VIOLATION" else (
        "Examination time expired" if session and session.status in ["TIME_EXPIRED", "EXPIRED"] else "Candidate manually submitted"
    )

    attempt_num = (
        db.query(ExamSession)
        .filter(ExamSession.exam_id == exam.id, ExamSession.student_id == student.id, ExamSession.id <= (session.id if session else 0))
        .count()
    ) if session else 1
    enrollment_num = student.student_profile.enrollment_number if student.student_profile else None
    
    # Never expose suspicion score to student
    suspicion_val = 0.0 if is_student else (getattr(result, "suspicion_score", 0.0) or (getattr(session, "suspicion_score", 0.0) if session else 0.0) or 0.0)

    evaluator_name = None
    if result.evaluated_by_id:
        eval_user = db.query(User).filter(User.id == result.evaluated_by_id).first()
        if eval_user:
            evaluator_name = eval_user.name

    if is_student and not is_published:
        return ExamSubmissionResult(
            result_id=result.id,
            exam_id=exam.id,
            exam_name=exam.name,
            subject=exam.subject,
            student_id=student.id,
            student_name=student.name,
            registration_number=student.registration_number,
            student_enrollment_number=enrollment_num,
            session_id=session.id if session else 0,
            attempt_number=attempt_num,
            total_questions=len(paper_q_ids),
            attempted_questions=attempted,
            correct_answers=0,
            incorrect_answers=0,
            unanswered_questions=unanswered,
            total_marks=0.0,
            negative_marks_deducted=0.0,
            maximum_marks=result.maximum_marks,
            percentage=0.0,
            passed=False,
            status="AWAITING_EVALUATION",
            result_status="AWAITING_EVALUATION",
            evaluation_status=eval_status,
            is_published=False,
            evaluation_finalized_at=None,
            result_published_at=None,
            evaluated_by_id=None,
            evaluated_by_name=None,
            evaluator_remarks=None,
            submission_status=sub_status,
            submission_reason=sub_reason,
            suspicion_score=0.0,
            submitted_at=(session.submitted_at if session else None) or result.created_at,
            breakdown=breakdown
        )

    return ExamSubmissionResult(
        result_id=result.id,
        exam_id=exam.id,
        exam_name=exam.name,
        subject=exam.subject,
        student_id=student.id,
        student_name=student.name,
        registration_number=student.registration_number,
        student_enrollment_number=enrollment_num,
        session_id=session.id if session else 0,
        attempt_number=attempt_num,
        total_questions=len(paper_q_ids),
        attempted_questions=attempted,
        correct_answers=correct,
        incorrect_answers=incorrect,
        unanswered_questions=unanswered,
        total_marks=result.total_marks,
        negative_marks_deducted=neg_total,
        maximum_marks=result.maximum_marks,
        percentage=result.percentage,
        passed=passed,
        status=result.status,
        result_status=result.status,
        evaluation_status=eval_status,
        is_published=is_published,
        evaluation_finalized_at=result.evaluation_finalized_at,
        result_published_at=result.result_published_at,
        evaluated_by_id=result.evaluated_by_id,
        evaluated_by_name=evaluator_name,
        evaluator_remarks=result.evaluator_remarks,
        submission_status=sub_status,
        submission_reason=sub_reason,
        suspicion_score=suspicion_val,
        submitted_at=(session.submitted_at if session else None) or result.created_at,
        breakdown=breakdown
    )

@router.get("/my-results", response_model=List[ExamSubmissionResult])
def api_get_my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Retrieve list of assessment results for the authenticated student."""
    results = (
        db.query(Result)
        .filter(Result.student_id == current_user.id)
        .order_by(Result.created_at.desc())
        .all()
    )
    return [build_result_submission_response(db, r, requester=current_user) for r in results]

@router.get("/by-session/{session_id}", response_model=ExamSubmissionResult)
def api_get_result_by_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed examination scorecard by session ID."""
    result = db.query(Result).filter(Result.session_id == session_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found for this session")

    # Access control
    if current_user.role == UserRole.STUDENT and result.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view results of another candidate."
        )

    return build_result_submission_response(db, result, requester=current_user)

@router.get("/{result_id}", response_model=ExamSubmissionResult)
def api_get_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed examination scorecard. Strict RBAC: Student can only view own result."""
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")

    # Access control
    if current_user.role == UserRole.STUDENT and result.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view results of another candidate."
        )

    return build_result_submission_response(db, result, requester=current_user)

@router.put("/{result_id}/review", response_model=ExamSubmissionResult)
def api_review_result(
    result_id: int,
    review_in: ReviewResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Review and score candidate subjective answers (Examiner / Admin only)."""
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")

    session = result.session
    if not session:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No session found for this result")

    for rev in review_in.question_reviews:
        answer = db.query(Answer).filter(
            Answer.session_id == session.id,
            Answer.question_id == rev.question_id
        ).first()
        if answer:
            answer.marks_awarded = rev.marks_awarded
            if rev.feedback is not None:
                answer.evaluator_feedback = rev.feedback
            answer.is_evaluated = True

    db.commit()

    all_answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    total_score = sum((a.marks_awarded or 0.0) for a in all_answers)
    final_score = max(0.0, total_score)
    percentage = round((final_score / result.maximum_marks) * 100, 2) if result.maximum_marks > 0 else 0.0
    passed = percentage >= 50.0

    if review_in.status in ["PASSED", "FAILED"]:
        result.status = review_in.status
    elif result.status in ["PASSED", "FAILED"]:
        pass
    else:
        result.status = "PASSED" if passed else "FAILED"

    now = datetime.now(timezone.utc)
    result.total_marks = final_score
    result.percentage = percentage
    result.evaluation_status = "PUBLISHED"
    result.evaluation_finalized_at = now
    result.result_published_at = now
    result.evaluated_by_id = current_user.id
    db.commit()
    db.refresh(result)

    # Notify student that their subjective evaluation / reviewed result is ready
    create_notification(
        db=db,
        user_id=result.student_id,
        type="RESULT_PUBLISHED",
        title=f"Result Evaluated: {result.exam.name}",
        message=f"Your examination submission for '{result.exam.name}' has been reviewed. Final Score: {result.total_marks}/{result.maximum_marks} ({result.percentage}%) - {result.status}.",
        link="/student/results"
    )

    return build_result_submission_response(db, result, requester=current_user)

@router.get("/{result_id}/download/pdf")
def api_download_result_pdf(
    result_id: int,
    lang: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download official candidate performance transcript PDF."""
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")

    if current_user.role == UserRole.STUDENT and result.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot download results of another candidate."
        )

    # STRICT RBAC: Only allow PDF download if PUBLISHED
    eval_status = getattr(result, "evaluation_status", None) or "SUBMITTED"
    if current_user.role == UserRole.STUDENT and eval_status != "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Result has not been officially declared yet. The Result PDF transcript is available only after evaluation is finalized and published."
        )

    # Server audit logging for PDF download
    result.pdf_download_count = (getattr(result, "pdf_download_count", 0) or 0) + 1
    result.pdf_last_downloaded_at = datetime.now(timezone.utc)
    db.commit()

    pdf_bytes = generate_student_result_pdf(result, result.student, result.exam, downloaded_by=current_user, lang=lang)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Scorecard_Exam_{result.exam_id}_{result.student_id}_{lang}.pdf"}
    )

@router.get("/exam/{exam_id}", response_model=List[ExamSubmissionResult])
def api_get_exam_results(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """List all candidate results for an exam (Examiner / Admin view)."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    results = (
        db.query(Result)
        .filter(Result.exam_id == exam_id)
        .order_by(Result.percentage.desc())
        .all()
    )
    return [build_result_submission_response(db, r) for r in results]

@router.get("/exam/{exam_id}/export/csv")
def api_export_exam_results_csv(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export candidate exam results to downloadable CSV format."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    results = (
        db.query(Result)
        .filter(Result.exam_id == exam_id)
        .order_by(Result.percentage.desc())
        .all()
    )
    csv_str = export_results_csv(results)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=exam_{exam_id}_results.csv"}
    )
