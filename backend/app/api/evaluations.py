from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, require_examiner_or_admin, get_current_user
from app.models.user import User, UserRole
from app.models.result import Result
from app.models.exam import Exam
from app.models.session import ExamSession, Answer
from app.models.question import QuestionBank, QuestionType
from app.schemas.session import (
    PendingEvaluationItem,
    EvaluationSessionDetailResponse,
    GradeQuestionRequest,
    FinalizeEvaluationRequest,
    PublishResultRequest,
    QuestionResultBreakdown,
    ExamSubmissionResult
)
from app.services.notification_service import create_notification
from app.services.paper_generator import generate_paper_for_student

router = APIRouter(prefix="/evaluations", tags=["Valuation & Evaluations"])

@router.get("/pending", response_model=List[PendingEvaluationItem])
def api_get_pending_evaluations(
    exam_id: Optional[int] = None,
    evaluation_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """List student examination submissions awaiting valuation, in progress, or ready for publication."""
    query = (
        db.query(ExamSession)
        .filter(ExamSession.status.in_(["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"]))
        .join(Exam, ExamSession.exam_id == Exam.id)
    )

    if exam_id:
        query = query.filter(ExamSession.exam_id == exam_id)

    sessions = query.order_by(ExamSession.submitted_at.desc().nullslast()).all()
    items: List[PendingEvaluationItem] = []

    for s in sessions:
        res = db.query(Result).filter(Result.session_id == s.id).first()
        status_val = getattr(res, "evaluation_status", None) or "SUBMITTED"

        if evaluation_status and status_val != evaluation_status:
            continue

        student = s.student
        exam = s.exam

        # Reconstruct paper to count questions and progress
        try:
            paper = generate_paper_for_student(db, exam.id, student.id, check_time_window=False)
            total_q = len(paper.questions)
            paper_q_ids = [q.id for q in paper.questions]
        except Exception:
            total_q = 0
            paper_q_ids = []

        answers = db.query(Answer).filter(Answer.session_id == s.id).all()
        ans_map = {a.question_id: a for a in answers}

        # Check for subjective questions
        questions_in_paper = db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all() if paper_q_ids else []
        has_subjective = any(
            q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD]
            for q in questions_in_paper
        )

        # Count evaluated
        evaluated_q = 0
        for q in questions_in_paper:
            ans = ans_map.get(q.id)
            if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
                evaluated_q += 1
            elif ans and (ans.is_evaluated or ans.marks_awarded is not None):
                evaluated_q += 1

        prog = round((evaluated_q / total_q) * 100, 1) if total_q > 0 else 0.0

        attempt_num = (
            db.query(ExamSession)
            .filter(ExamSession.exam_id == exam.id, ExamSession.student_id == student.id, ExamSession.id <= s.id)
            .count()
        )

        items.append(PendingEvaluationItem(
            session_id=s.id,
            result_id=res.id if res else None,
            exam_id=exam.id,
            exam_name=exam.name,
            subject=exam.subject,
            student_id=student.id,
            student_name=student.name,
            registration_number=student.registration_number,
            attempt_number=attempt_num,
            submitted_at=s.submitted_at or s.created_at,
            evaluation_status=status_val,
            total_questions=total_q,
            evaluated_questions=evaluated_q,
            progress_percentage=prog,
            has_subjective=has_subjective
        ))

    return items

@router.get("/session/{session_id}", response_model=EvaluationSessionDetailResponse)
def api_get_evaluation_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Retrieve full evaluation workspace payload for an examination submission."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found")

    exam = session.exam
    student = session.student
    result = db.query(Result).filter(Result.session_id == session_id).first()

    # Generate deterministic paper
    paper = generate_paper_for_student(db, exam.id, student.id, check_time_window=False)
    paper_q_ids = [q.id for q in paper.questions]

    answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    ans_map = {a.question_id: a for a in answers}

    questions_map = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all()}

    breakdown: List[QuestionResultBreakdown] = []
    evaluated_count = 0
    running_total = 0.0

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

        is_eval = False
        if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            is_eval = True
        elif ans and (getattr(ans, "is_evaluated", False) or ans.marks_awarded is not None):
            is_eval = True

        if is_eval:
            evaluated_count += 1
            running_total += max(0.0, marks_awarded)

        if is_att and marks_awarded > 0:
            is_corr = True
        elif is_att and marks_awarded < 0:
            neg_ded = abs(marks_awarded)

        options_data = [
            {"id": o.id, "text": o.option_text, "is_correct": o.is_correct}
            for o in sorted(q.options, key=lambda x: x.option_order)
        ]

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
            options_info=options_data
        ))

    total_q = len(paper_q_ids)
    prog = round((evaluated_count / total_q) * 100, 1) if total_q > 0 else 0.0

    attempt_num = (
        db.query(ExamSession)
        .filter(ExamSession.exam_id == exam.id, ExamSession.student_id == student.id, ExamSession.id <= session.id)
        .count()
    )

    eval_status = getattr(result, "evaluation_status", None) or "SUBMITTED"
    is_fin = bool(result and result.evaluation_finalized_at) or eval_status in ["READY_FOR_PUBLICATION", "PUBLISHED"]
    is_pub = eval_status == "PUBLISHED"

    evaluator_name = None
    if result and result.evaluated_by_id:
        eval_user = db.query(User).filter(User.id == result.evaluated_by_id).first()
        if eval_user:
            evaluator_name = eval_user.name

    return EvaluationSessionDetailResponse(
        session_id=session.id,
        result_id=result.id if result else None,
        exam_id=exam.id,
        exam_name=exam.name,
        subject=exam.subject,
        maximum_marks=exam.maximum_marks,
        duration_minutes=exam.duration_minutes,
        student_id=student.id,
        student_name=student.name,
        registration_number=student.registration_number,
        student_email=student.email,
        attempt_number=attempt_num,
        started_at=session.started_at,
        submitted_at=session.submitted_at or session.created_at,
        evaluation_status=eval_status,
        is_finalized=is_fin,
        is_published=is_pub,
        evaluation_finalized_at=result.evaluation_finalized_at if result else None,
        result_published_at=result.result_published_at if result else None,
        evaluated_by_id=result.evaluated_by_id if result else None,
        evaluated_by_name=evaluator_name,
        evaluator_remarks=result.evaluator_remarks if result else None,
        total_questions=total_q,
        evaluated_questions=evaluated_count,
        progress_percentage=prog,
        current_total_marks=running_total,
        status=result.status if result else None,
        questions=breakdown
    )

@router.post("/session/{session_id}/grade-question")
def api_grade_session_question(
    session_id: int,
    grade_in: GradeQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Save authoritative marks and remarks for a single question response."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found")

    question = db.query(QuestionBank).filter(QuestionBank.id == grade_in.question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    if grade_in.marks_awarded > question.marks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Marks awarded ({grade_in.marks_awarded}) cannot exceed maximum possible marks ({question.marks})."
        )

    answer = db.query(Answer).filter(
        Answer.session_id == session_id,
        Answer.question_id == grade_in.question_id
    ).first()

    now = datetime.now(timezone.utc)
    if answer:
        answer.marks_awarded = grade_in.marks_awarded
        if grade_in.evaluator_feedback is not None:
            answer.evaluator_feedback = grade_in.evaluator_feedback
        answer.is_evaluated = True
    else:
        answer = Answer(
            session_id=session_id,
            question_id=grade_in.question_id,
            marks_awarded=grade_in.marks_awarded,
            evaluator_feedback=grade_in.evaluator_feedback,
            is_evaluated=True,
            submitted_at=now
        )
        db.add(answer)

    # Update result status
    result = db.query(Result).filter(Result.session_id == session_id).first()
    if result:
        if getattr(result, "evaluation_status", None) not in ["READY_FOR_PUBLICATION", "PUBLISHED"]:
            result.evaluation_status = "EVALUATION_IN_PROGRESS"
        result.evaluated_by_id = current_user.id

    db.commit()

    return {
        "status": "success",
        "message": f"Marks recorded for Question #{grade_in.question_id}",
        "question_id": grade_in.question_id,
        "marks_awarded": grade_in.marks_awarded,
        "is_evaluated": True
    }

@router.post("/session/{session_id}/finalize")
def api_finalize_session_evaluation(
    session_id: int,
    fin_in: Optional[FinalizeEvaluationRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Mark all questions as evaluated, compute authoritative final marks, and mark READY_FOR_PUBLICATION."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found")

    exam = session.exam

    # Check paper questions to ensure all subjective questions are evaluated
    paper = generate_paper_for_student(db, exam.id, session.student_id, check_time_window=False)
    paper_q_ids = [q.id for q in paper.questions]
    questions_map = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all()}

    answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    ans_map = {a.question_id: a for a in answers}

    total_marks_accumulated = 0.0
    unevaluated_count = 0

    for q_id in paper_q_ids:
        q = questions_map.get(q_id)
        if not q:
            continue
        ans = ans_map.get(q_id)
        if q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD]:
            if not ans or (not getattr(ans, "is_evaluated", False) and ans.marks_awarded is None):
                unevaluated_count += 1
            else:
                total_marks_accumulated += max(0.0, ans.marks_awarded or 0.0)
        else:
            # Objective
            if ans and ans.marks_awarded is not None:
                total_marks_accumulated += max(0.0, ans.marks_awarded)

    if unevaluated_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot finalize: {unevaluated_count} subjective question(s) are still pending valuation."
        )

    remarks = fin_in.evaluator_remarks if fin_in else None
    status_override = fin_in.status if fin_in and fin_in.status in ["PASSED", "FAILED"] else None
    now = datetime.now(timezone.utc)
    result = db.query(Result).filter(Result.session_id == session_id).first()
    percentage = round((total_marks_accumulated / exam.maximum_marks) * 100, 2) if exam.maximum_marks > 0 else 0.0

    if not result:
        res_status = status_override if status_override else ("PASSED" if percentage >= 50.0 else "FAILED")
        result = Result(
            exam_id=exam.id,
            student_id=session.student_id,
            session_id=session_id,
            total_marks=total_marks_accumulated,
            maximum_marks=exam.maximum_marks,
            percentage=percentage,
            status=res_status,
            evaluation_status="READY_FOR_PUBLICATION",
            evaluation_finalized_at=now,
            evaluated_by_id=current_user.id,
            evaluator_remarks=remarks
        )
        db.add(result)
    else:
        result.total_marks = total_marks_accumulated
        result.percentage = percentage
        if status_override:
            result.status = status_override
        elif result.status in ["PASSED", "FAILED"]:
            pass  # preserve explicit authoritative examiner status
        else:
            result.status = "PASSED" if percentage >= 50.0 else "FAILED"
        result.evaluation_status = "READY_FOR_PUBLICATION"
        result.evaluation_finalized_at = now
        result.evaluated_by_id = current_user.id
        if remarks:
            result.evaluator_remarks = remarks

    db.commit()
    db.refresh(result)

    return {
        "status": "success",
        "message": "Evaluation successfully finalized. Assessment is now Ready for Publication.",
        "evaluation_status": result.evaluation_status,
        "evaluation_finalized_at": result.evaluation_finalized_at,
        "total_marks": result.total_marks,
        "maximum_marks": result.maximum_marks,
        "percentage": result.percentage
    }

@router.post("/session/{session_id}/publish")
def api_publish_session_result(
    session_id: int,
    pub_in: Optional[PublishResultRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Officially declare and publish examination result to the candidate."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found")

    exam = session.exam

    # Check that all questions are evaluated
    paper = generate_paper_for_student(db, exam.id, session.student_id, check_time_window=False)
    paper_q_ids = [q.id for q in paper.questions]
    questions_map = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all()}

    answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    ans_map = {a.question_id: a for a in answers}

    total_marks_accumulated = 0.0
    unevaluated_count = 0

    for q_id in paper_q_ids:
        q = questions_map.get(q_id)
        if not q:
            continue
        ans = ans_map.get(q_id)
        if q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD]:
            if not ans or (not getattr(ans, "is_evaluated", False) and ans.marks_awarded is None):
                unevaluated_count += 1
            else:
                total_marks_accumulated += max(0.0, ans.marks_awarded or 0.0)
        else:
            if ans and ans.marks_awarded is not None:
                total_marks_accumulated += max(0.0, ans.marks_awarded)

    if unevaluated_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish: {unevaluated_count} subjective question(s) have not been evaluated."
        )

    now = datetime.now(timezone.utc)
    result = db.query(Result).filter(Result.session_id == session_id).first()
    percentage = round((total_marks_accumulated / exam.maximum_marks) * 100, 2) if exam.maximum_marks > 0 else 0.0
    passed = percentage >= 50.0

    pub_remarks = pub_in.evaluator_remarks if pub_in else None
    pub_status_override = pub_in.status if pub_in and pub_in.status in ["PASSED", "FAILED"] else None
    if not result:
        res_status = pub_status_override if pub_status_override else ("PASSED" if passed else "FAILED")
        result = Result(
            exam_id=exam.id,
            student_id=session.student_id,
            session_id=session_id,
            total_marks=total_marks_accumulated,
            maximum_marks=exam.maximum_marks,
            percentage=percentage,
            status=res_status,
            evaluation_status="PUBLISHED",
            evaluation_finalized_at=now,
            result_published_at=now,
            evaluated_by_id=current_user.id,
            evaluator_remarks=pub_remarks
        )
        db.add(result)
    else:
        result.total_marks = total_marks_accumulated
        result.percentage = percentage
        if pub_status_override:
            result.status = pub_status_override
        elif result.status in ["PASSED", "FAILED"]:
            pass  # preserve explicit authoritative examiner status
        else:
            result.status = "PASSED" if passed else "FAILED"
        result.evaluation_status = "PUBLISHED"
        if not result.evaluation_finalized_at:
            result.evaluation_finalized_at = now
        result.result_published_at = now
        if not result.evaluated_by_id:
            result.evaluated_by_id = current_user.id
        if pub_remarks:
            result.evaluator_remarks = pub_remarks

    db.commit()
    db.refresh(result)

    # Dispatched student notification
    create_notification(
        db=db,
        user_id=session.student_id,
        type="RESULT_PUBLISHED",
        title=f"Result Published: {exam.name}",
        message=f"Your official performance scorecard for '{exam.name}' has been declared. Score: {result.total_marks}/{result.maximum_marks} ({result.percentage}%) - {result.status}.",
        link="/student/results"
    )

    return {
        "status": "success",
        "message": f"Official examination result for {session.student.name} declared and published.",
        "result_id": result.id,
        "evaluation_status": "PUBLISHED",
        "result_published_at": result.result_published_at,
        "total_marks": result.total_marks,
        "maximum_marks": result.maximum_marks,
        "percentage": result.percentage,
        "passed": passed
    }
