import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.exam import Exam
from app.models.user import User
from app.models.registration import ExamRegistration
from app.models.session import ExamSession, Answer
from app.models.result import Result
from app.models.proctor import ProctorEvent
from app.models.question import QuestionBank, Option, QuestionType
from app.models.attempt_permission import ExamAttemptPermission
from app.services.paper_generator import generate_paper_for_student, ensure_utc
from app.services.notification_service import create_notification
from app.core.security import create_exam_access_token, verify_exam_access_token
from app.schemas.session import (
    SessionStartResponse,
    SavedAnswerItem,
    QuestionResultBreakdown,
    ExamSubmissionResult,
    ProctorEventActionResponse,
    SessionHeartbeatResponse,
    SessionPauseResponse,
    SessionResumeResponse
)

VIOLATION_EVENT_TYPES = {
    "TAB_SWITCH",
    "WINDOW_BLUR",
    "FULLSCREEN_EXIT",
    "FACE_ABSENT",
    "MULTIPLE_FACES_DETECTED",
    "OFF_SCREEN_GAZE"
}

SUSPICION_WEIGHTS = {
    "TAB_SWITCH": 15.0,
    "WINDOW_BLUR": 5.0,
    "FULLSCREEN_EXIT": 15.0,
    "FACE_ABSENT": 20.0,
    "MULTIPLE_FACES_DETECTED": 25.0,
    "MULTIPLE_FACES": 25.0,
    "OFF_SCREEN_GAZE": 10.0,
}

def calculate_suspicion_score(events: List[ProctorEvent]) -> float:
    """Calculate deterministic server-side suspicion score bounded between 0 and 100."""
    total = sum(SUSPICION_WEIGHTS.get(e.event_type, 0.0) for e in events)
    return min(100.0, round(total, 2))


def get_or_create_exam_session(db: Session, exam_id: int, student: User) -> SessionStartResponse:
    """Retrieve an existing active exam session or initialize a new one with server timer."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    now = datetime.now(timezone.utc)

    # Check for active, approved re-attempt permission
    active_perm = (
        db.query(ExamAttemptPermission)
        .filter(
            ExamAttemptPermission.exam_id == exam_id,
            ExamAttemptPermission.student_id == student.id,
            ExamAttemptPermission.status == "ACTIVE"
        )
        .order_by(ExamAttemptPermission.id.desc())
        .first()
    )
    has_valid_active_perm = (
        active_perm is not None
        and active_perm.attempts_used < active_perm.max_additional_attempts
        and (active_perm.expires_at is None or ensure_utc(active_perm.expires_at) >= now)
    )

    # Validate exam timing window
    if not has_valid_active_perm:
        if now < ensure_utc(exam.start_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam window has not opened yet."
            )
        if now > ensure_utc(exam.end_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam window has closed. Submissions are no longer accepted."
            )
    else:
        # Reattempt permission window check
        if active_perm.expires_at and now > ensure_utc(active_perm.expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Re-attempt authorization window has expired."
            )

    # Enforce registration requirement (auto-activate registration if authorized re-attempt exists)
    registration = (
        db.query(ExamRegistration)
        .filter(ExamRegistration.exam_id == exam_id, ExamRegistration.student_id == student.id)
        .first()
    )
    if not registration:
        if has_valid_active_perm:
            registration = ExamRegistration(
                exam_id=exam_id,
                student_id=student.id,
                status="REGISTERED",
                registered_at=now
            )
            db.add(registration)
            db.commit()
            db.refresh(registration)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must register for this examination before attempting to start a session."
            )
    elif registration.status != "REGISTERED":
        if has_valid_active_perm:
            registration.status = "REGISTERED"
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must register for this examination before attempting to start a session."
            )

    # 1. Look for an active or camera-paused session (to resume)
    active_session = (
        db.query(ExamSession)
        .filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == student.id,
            ExamSession.status.in_(["ACTIVE", "CAMERA_PAUSED"])
        )
        .order_by(ExamSession.id.desc())
        .first()
    )

    if active_session:
        session = active_session
    else:
        # 2. Check if student already completed a previous attempt
        past_attempts = (
            db.query(ExamSession)
            .filter(
                ExamSession.exam_id == exam_id,
                ExamSession.student_id == student.id,
                ExamSession.status.in_(["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"])
            )
            .all()
        )

        if past_attempts:
            # Re-attempt permission is REQUIRED
            if not has_valid_active_perm or not active_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="REATTEMPT_ACCESS_REQUIRED: Your previous attempt for this examination is already recorded. Please contact the Examiner/Admin to request another attempt."
                )

            # Consume EXACTLY ONE permitted attempt
            active_perm.attempts_used += 1
            if active_perm.attempts_used >= active_perm.max_additional_attempts:
                active_perm.status = "USED"
            active_perm.updated_at = now
            db.commit()

        # 3. Initialize fresh independent session
        session = ExamSession(
            exam_id=exam_id,
            student_id=student.id,
            started_at=now,
            status="ACTIVE",
            session_token=secrets.token_urlsafe(32)
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Compute server-authoritative remaining time
    started_at = ensure_utc(session.started_at)
    deadline_by_duration = started_at + timedelta(minutes=exam.duration_minutes)
    if has_valid_active_perm and (active_perm.expires_at or now > ensure_utc(exam.end_time)):
        effective_end = ensure_utc(active_perm.expires_at) if active_perm.expires_at else (now + timedelta(minutes=exam.duration_minutes + 60))
        deadline = min(deadline_by_duration, effective_end)
    else:
        deadline = min(deadline_by_duration, ensure_utc(exam.end_time))

    if session.status == "CAMERA_PAUSED":
        pause_event = (
            db.query(ProctorEvent)
            .filter(ProctorEvent.session_id == session.id, ProctorEvent.event_type == "EXAM_CAMERA_PAUSED")
            .order_by(ProctorEvent.id.desc())
            .first()
        )
        pause_time = ensure_utc(pause_event.created_at) if pause_event else now
        remaining_seconds = max(0, int((deadline - pause_time).total_seconds()))
    else:
        remaining_seconds = max(0, int((deadline - now).total_seconds()))

    if remaining_seconds <= 0 and session.status == "ACTIVE":
        # Time expired: trigger auto-submit
        return finalize_and_grade_session(db, session.id, student, auto_reason="EXPIRED")

    # Generate deterministic paper
    paper = generate_paper_for_student(db, exam_id, student.id, check_time_window=False)

    # Count tab switch and security violations
    tab_warnings = db.query(ProctorEvent).filter(
        ProctorEvent.session_id == session.id,
        ProctorEvent.event_type.in_(VIOLATION_EVENT_TYPES),
        ProctorEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])
    ).count()

    # Fetch any already saved answers for resumption
    existing_answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    saved_answers_list = [
        SavedAnswerItem(
            question_id=a.question_id,
            selected_option_ids=a.selected_option_ids,
            answer_text=a.answer_text,
            image_path=a.image_path,
            is_marked_for_review=bool(a.is_marked_for_review)
        )
        for a in existing_answers
    ]

    exam_access_jwt = create_exam_access_token(
        exam_id=exam.id,
        student_id=student.id,
        session_id=session.id,
        duration_minutes=exam.duration_minutes
    )

    return SessionStartResponse(
        session_id=session.id,
        exam_id=exam.id,
        exam_name=exam.name,
        subject=exam.subject,
        duration_minutes=exam.duration_minutes,
        started_at=session.started_at,
        remaining_seconds=remaining_seconds,
        status=session.status,
        session_token=session.session_token,
        exam_access_token=exam_access_jwt,
        maximum_tab_switch_warnings=exam.maximum_tab_switch_warnings,
        current_tab_warnings=tab_warnings,
        tab_switch_count=tab_warnings,
        submission_reason=None if session.status == "ACTIVE" else session.status,
        webcam_monitoring_enabled=exam.webcam_monitoring_enabled,
        questions=paper.questions,
        saved_answers=saved_answers_list
    )

def save_session_answer(
    db: Session,
    session_id: int,
    student: User,
    question_id: int,
    selected_option_ids: Optional[List[int]] = None,
    answer_text: Optional[str] = None,
    image_path: Optional[str] = None,
    is_marked_for_review: Optional[bool] = None
) -> Answer:
    """Save or update candidate's draft response for a question."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot save answer. Session status is {session.status}."
        )

    # Check if remaining time has expired
    exam = session.exam
    now = datetime.now(timezone.utc)
    started_at = ensure_utc(session.started_at)
    deadline = min(started_at + timedelta(minutes=exam.duration_minutes), ensure_utc(exam.end_time))
    if now > deadline:
        finalize_and_grade_session(db, session_id, student, auto_reason="EXPIRED")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam duration has expired. Session auto-submitted."
        )

    # Word count validation for text responses
    if answer_text is not None and answer_text.strip():
        q_obj = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
        if q_obj:
            word_count = len(answer_text.strip().split())
            if q_obj.question_type == QuestionType.SHORT_ANSWER and word_count > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SHORT_ANSWER exceeds maximum limit of 100 words (Current: {word_count} words)."
                )
            elif q_obj.question_type == QuestionType.LONG_ANSWER and word_count > 600:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"LONG_ANSWER exceeds maximum limit of 600 words (Current: {word_count} words)."
                )

    answer = db.query(Answer).filter(
        Answer.session_id == session_id,
        Answer.question_id == question_id
    ).first()

    if answer:
        answer.selected_option_ids = selected_option_ids
        answer.answer_text = answer_text
        answer.image_path = image_path
        if is_marked_for_review is not None:
            answer.is_marked_for_review = is_marked_for_review
        answer.submitted_at = now
    else:
        answer = Answer(
            session_id=session_id,
            question_id=question_id,
            selected_option_ids=selected_option_ids,
            answer_text=answer_text,
            image_path=image_path,
            is_marked_for_review=is_marked_for_review if is_marked_for_review is not None else False,
            submitted_at=now
        )
        db.add(answer)

    db.commit()
    db.refresh(answer)
    return answer

def record_proctor_event(
    db: Session,
    session_id: int,
    student: User,
    event_type: str,
    event_data: Optional[Dict[str, Any]] = None,
    severity: str = "LOW"
) -> ProctorEventActionResponse:
    """Record a proctoring event. Enforces authoritative violation counting and auto-submit threshold."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    now = datetime.now(timezone.utc)
    max_allowed = session.exam.maximum_tab_switch_warnings

    # Backend Deduplication Policy:
    # A single browser tab switch can fire both visibilitychange (TAB_SWITCH) and blur (WINDOW_BLUR).
    # If a violation event arrives within 1.5s of a preceding violation for this session,
    # log it with LOW severity so it is NOT counted as a separate violation.
    is_duplicate = False
    if event_type in VIOLATION_EVENT_TYPES:
        recent_violation = (
            db.query(ProctorEvent)
            .filter(
                ProctorEvent.session_id == session_id,
                ProctorEvent.event_type.in_(VIOLATION_EVENT_TYPES),
                ProctorEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])
            )
            .order_by(ProctorEvent.created_at.desc())
            .first()
        )
        if recent_violation:
            time_diff = (now - ensure_utc(recent_violation.created_at)).total_seconds()
            if time_diff < 1.5:
                # Deduplicate ONLY the browser companion pair TAB_SWITCH + WINDOW_BLUR resulting from a single action.
                # Do NOT suppress repeated TAB_SWITCH events, and do NOT suppress distinct face proctoring events.
                if {recent_violation.event_type, event_type} == {"TAB_SWITCH", "WINDOW_BLUR"}:
                    is_duplicate = True

    event_severity = "LOW" if is_duplicate else severity

    event = ProctorEvent(
        session_id=session_id,
        event_type=event_type,
        event_data=event_data,
        severity=event_severity
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Calculate authoritative server-side suspicion score
    all_events = db.query(ProctorEvent).filter(ProctorEvent.session_id == session_id).all()
    session.suspicion_score = calculate_suspicion_score(all_events)
    db.commit()
    db.refresh(session)

    # Calculate authoritative violation count directly from PostgreSQL
    violation_count = (
        db.query(ProctorEvent)
        .filter(
            ProctorEvent.session_id == session_id,
            ProctorEvent.event_type.in_(VIOLATION_EVENT_TYPES),
            ProctorEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])
        )
        .count()
    )

    # Check if session is already finalized (idempotent handling)
    if session.status in ["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"]:
        result = db.query(Result).filter(Result.session_id == session_id).first()
        sub_reason = "Maximum proctoring violations reached" if session.status == "SUBMITTED_VIOLATION" else (
            "Examination time expired" if session.status in ["TIME_EXPIRED", "EXPIRED"] else "Candidate manually submitted"
        )
        return ProctorEventActionResponse(
            id=event.id,
            session_id=session.id,
            event_type=event.event_type,
            severity=event.severity,
            event_data=event.event_data,
            created_at=event.created_at,
            warning_issued=False,
            current_warnings=violation_count,
            maximum_allowed=max_allowed,
            auto_submitted=True,
            session_status=session.status,
            submission_reason=sub_reason,
            result_id=result.id if result else None,
            message=f"Session already finalized ({session.status})."
        )

    # If it's a valid non-duplicate violation event
    if event_type in VIOLATION_EVENT_TYPES and not is_duplicate:
        # EXACT THRESHOLD RULE:
        # If maximum_tab_switch_warnings = 3:
        # 1st violation -> warning 1, ACTIVE
        # 2nd violation -> warning 2, ACTIVE
        # 3rd violation -> warning 3, ACTIVE
        # 4th violation -> AUTO SUBMIT (violation_count > maximum_tab_switch_warnings)
        # If maximum_tab_switch_warnings = 0:
        # 1st violation -> AUTO SUBMIT (1 > 0)
        if violation_count > max_allowed:
            sub_res = finalize_and_grade_session(db, session_id, student, auto_reason="SUBMITTED_VIOLATION")
            return ProctorEventActionResponse(
                id=event.id,
                session_id=session.id,
                event_type=event.event_type,
                severity=event.severity,
                event_data=event.event_data,
                created_at=event.created_at,
                warning_issued=True,
                current_warnings=violation_count,
                maximum_allowed=max_allowed,
                auto_submitted=True,
                session_status="SUBMITTED_VIOLATION",
                submission_reason="Maximum proctoring violations reached",
                result_id=sub_res.result_id,
                message=f"Maximum allowed proctoring violations ({max_allowed}) exceeded. Examination auto-submitted."
            )
        else:
            return ProctorEventActionResponse(
                id=event.id,
                session_id=session.id,
                event_type=event.event_type,
                severity=event.severity,
                event_data=event.event_data,
                created_at=event.created_at,
                warning_issued=True,
                current_warnings=violation_count,
                maximum_allowed=max_allowed,
                auto_submitted=False,
                session_status="ACTIVE",
                submission_reason=None,
                result_id=None,
                message=f"Security violation warning {violation_count} of {max_allowed}."
            )

    # Duplicate or non-violation event
    return ProctorEventActionResponse(
        id=event.id,
        session_id=session.id,
        event_type=event.event_type,
        severity=event.severity,
        event_data=event.event_data,
        created_at=event.created_at,
        warning_issued=False,
        current_warnings=violation_count,
        maximum_allowed=max_allowed,
        auto_submitted=False,
        session_status=session.status,
        submission_reason=None,
        result_id=None,
        message="Duplicate event ignored or non-violation event recorded."
    )

def finalize_and_grade_session(
    db: Session,
    session_id: int,
    student: User,
    auto_reason: Optional[str] = None
) -> ExamSubmissionResult:
    """Evaluate candidate answers, calculate negative marking, and generate Result. Fully idempotent."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    exam = session.exam
    now = datetime.now(timezone.utc)

    # Fetch paper questions for this student (do not check time window during grading)
    paper = generate_paper_for_student(db, exam.id, student.id, check_time_window=False)
    paper_q_ids = [q.id for q in paper.questions]
    paper_questions = db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all()
    q_map = {q.id: q for q in paper_questions}

    # Fetch candidate answers
    saved_answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    ans_map = {a.question_id: a for a in saved_answers}

    # IDEMPOTENCY CHECK: If session already finalized and Result exists, return existing Result
    existing_result = db.query(Result).filter(Result.session_id == session_id).first()
    if existing_result and session.status in ["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"]:
        attempted_count = 0
        correct_count = 0
        incorrect_count = 0
        total_negative_deducted = 0.0
        breakdown: List[QuestionResultBreakdown] = []

        for q_id in paper_q_ids:
            q = q_map.get(q_id)
            if not q:
                continue
            ans = ans_map.get(q_id)
            is_att = ans is not None and (bool(ans.selected_option_ids) or bool(ans.answer_text) or bool(ans.image_path))
            correct_opt_ids = [o.id for o in q.options if o.is_correct]
            marks_awarded = ans.marks_awarded if ans and ans.marks_awarded is not None else 0.0
            neg_ded = 0.0
            is_corr = False
            if is_att:
                attempted_count += 1
                if marks_awarded > 0:
                    is_corr = True
                    correct_count += 1
                else:
                    incorrect_count += 1
                    if marks_awarded < 0:
                        neg_ded = abs(marks_awarded)
                        total_negative_deducted += neg_ded

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
                selected_option_ids=ans.selected_option_ids if ans else None,
                correct_option_ids=correct_opt_ids if q.options else None,
                student_text_answer=ans.answer_text if ans else None
            ))

        sub_status = "AUTO SUBMITTED" if session.status in ["SUBMITTED_VIOLATION", "TIME_EXPIRED", "EXPIRED"] else "SUBMITTED"
        sub_reason = "Maximum proctoring violations reached" if session.status == "SUBMITTED_VIOLATION" else (
            "Examination time expired" if session.status in ["TIME_EXPIRED", "EXPIRED"] else "Candidate manually submitted"
        )

        return ExamSubmissionResult(
            result_id=existing_result.id,
            exam_id=exam.id,
            exam_name=exam.name,
            subject=exam.subject,
            student_id=student.id,
            student_name=student.name,
            registration_number=student.registration_number,
            session_id=session.id,
            total_questions=len(paper_q_ids),
            attempted_questions=attempted_count,
            correct_answers=correct_count,
            incorrect_answers=incorrect_count,
            unanswered_questions=len(paper_q_ids) - attempted_count,
            total_marks=existing_result.total_marks,
            negative_marks_deducted=total_negative_deducted,
            maximum_marks=existing_result.maximum_marks,
            percentage=existing_result.percentage,
            passed=(existing_result.status == "PASSED") if existing_result.status in ["PASSED", "FAILED"] else (existing_result.percentage >= 50.0),
            status=existing_result.status,
            result_status=existing_result.status,
            submission_status=sub_status,
            submission_reason=sub_reason,
            suspicion_score=session.suspicion_score if hasattr(session, "suspicion_score") else 0.0,
            submitted_at=session.submitted_at or existing_result.created_at,
            breakdown=breakdown
        )

    total_marks_awarded = 0.0
    total_negative_deducted = 0.0
    correct_count = 0
    incorrect_count = 0
    attempted_count = 0
    breakdown: List[QuestionResultBreakdown] = []

    for q_id in paper_q_ids:
        q = q_map.get(q_id)
        if not q:
            continue

        ans = ans_map.get(q_id)
        is_attempted = False
        is_correct = False
        marks_awarded = 0.0
        neg_deducted = 0.0
        correct_opt_ids = [o.id for o in q.options if o.is_correct]

        if ans:
            if q.question_type == QuestionType.MCQ:
                if ans.selected_option_ids and len(ans.selected_option_ids) > 0:
                    is_attempted = True
                    selected_id = ans.selected_option_ids[0]
                    if selected_id in correct_opt_ids:
                        is_correct = True
                        marks_awarded = q.marks
                    else:
                        is_correct = False
                        if exam.negative_marking_enabled:
                            neg_deducted = q.negative_marks
                            marks_awarded = -q.negative_marks
                ans.marks_awarded = marks_awarded
                ans.is_evaluated = True

            elif q.question_type == QuestionType.MULTI_SELECT:
                if ans.selected_option_ids and len(ans.selected_option_ids) > 0:
                    is_attempted = True
                    selected_set = set(ans.selected_option_ids)
                    correct_set = set(correct_opt_ids)
                    if selected_set == correct_set:
                        is_correct = True
                        marks_awarded = q.marks
                    else:
                        is_correct = False
                        if exam.negative_marking_enabled:
                            neg_deducted = q.negative_marks
                            marks_awarded = -q.negative_marks
                ans.marks_awarded = marks_awarded
                ans.is_evaluated = True

            elif q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER]:
                if ans.answer_text and ans.answer_text.strip():
                    is_attempted = True
                ans.marks_awarded = None
                ans.is_evaluated = False
                marks_awarded = 0.0

            elif q.question_type == QuestionType.IMAGE_UPLOAD:
                if ans.image_path:
                    is_attempted = True
                ans.marks_awarded = None
                ans.is_evaluated = False
                marks_awarded = 0.0

        if is_attempted:
            attempted_count += 1
            if is_correct:
                correct_count += 1
            else:
                incorrect_count += 1

        total_marks_awarded += marks_awarded
        total_negative_deducted += neg_deducted

        breakdown.append(QuestionResultBreakdown(
            question_id=q.id,
            question_text=q.question_text,
            question_type=q.question_type.value,
            marks_possible=q.marks,
            marks_awarded=marks_awarded,
            negative_marks_deducted=neg_deducted,
            is_correct=is_correct,
            is_attempted=is_attempted,
            is_marked_for_review=bool(ans.is_marked_for_review) if ans else False,
            is_evaluated=getattr(ans, "is_evaluated", False) if ans else False,
            selected_option_ids=ans.selected_option_ids if ans else None,
            correct_option_ids=correct_opt_ids if q.options else None,
            student_text_answer=ans.answer_text if ans else None,
            image_path=ans.image_path if ans else None,
            thumbnail_path=getattr(ans, "thumbnail_path", None) if ans else None,
            ocr_text=getattr(ans, "ocr_text", None) if ans else None
        ))

    # Calculate preliminary objective score
    final_score = max(0.0, total_marks_awarded)
    percentage = round((final_score / exam.maximum_marks) * 100, 2) if exam.maximum_marks > 0 else 0.0
    passed = percentage >= 50.0

    # Determine evaluation status and result status
    has_subjective = any(
        q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD]
        for q in paper_questions
    )
    result_status = "UNDER_REVIEW" if has_subjective else ("PASSED" if passed else "FAILED")
    eval_status = "AWAITING_SUBJECTIVE_EVALUATION" if has_subjective else "READY_FOR_PUBLICATION"

    if has_subjective:
        try:
            from app.services.ai_grading_service import grade_session_subjective_answers
            grade_session_subjective_answers(db, session_id)
        except Exception:
            pass

    # Update session status and server-side suspicion score
    all_events = db.query(ProctorEvent).filter(ProctorEvent.session_id == session_id).all()
    session_suspicion = calculate_suspicion_score(all_events)

    final_session_status = auto_reason if auto_reason else "SUBMITTED"
    session.status = final_session_status
    session.suspicion_score = session_suspicion
    session.submitted_at = now

    # Save or update Result with explicit evaluation status
    result = db.query(Result).filter(Result.session_id == session_id).first()
    if not result:
        result = Result(
            exam_id=exam.id,
            student_id=student.id,
            session_id=session_id,
            total_marks=final_score,
            maximum_marks=exam.maximum_marks,
            percentage=percentage,
            status=result_status,
            evaluation_status=eval_status,
            suspicion_score=session_suspicion
        )
        db.add(result)
    else:
        result.total_marks = final_score
        result.maximum_marks = exam.maximum_marks
        result.percentage = percentage
        result.status = result_status
        result.evaluation_status = eval_status
        result.suspicion_score = session_suspicion

    db.commit()
    db.refresh(result)

    unanswered_count = len(paper_q_ids) - attempted_count
    sub_status = "AUTO SUBMITTED" if auto_reason else "SUBMITTED"
    sub_reason = "Maximum allowed proctoring violations reached" if auto_reason == "SUBMITTED_VIOLATION" else (
        "Examination time expired" if auto_reason in ["TIME_EXPIRED", "EXPIRED"] else "Manual submission"
    )

    # 1. Notify the student that the exam is completed and submitted for evaluation (NO premature score disclosure)
    create_notification(
        db=db,
        user_id=student.id,
        type="EXAM_COMPLETED",
        title=f"Exam Submitted: {exam.name}",
        message=f"Your submission for '{exam.name}' has been received ({sub_status}). Your answers have been submitted for evaluation.",
        link="/student/results"
    )

    # 2. Notify the examiner / exam creator that a submission arrived
    if exam.created_by:
        create_notification(
            db=db,
            user_id=exam.created_by,
            type="EXAM_COMPLETED",
            title=f"Submission Received: {exam.name}",
            message=f"Student {student.name} ({student.registration_number or student.email}) submitted '{exam.name}' ({sub_status}). Score: {final_score}/{exam.maximum_marks} ({percentage}%).",
            link="/examiner/results"
        )

    attempt_num = (
        db.query(ExamSession)
        .filter(ExamSession.exam_id == exam.id, ExamSession.student_id == student.id, ExamSession.id <= session.id)
        .count()
    )
    enrollment_num = student.student_profile.enrollment_number if student.student_profile else None

    return ExamSubmissionResult(
        result_id=result.id,
        exam_id=exam.id,
        exam_name=exam.name,
        subject=exam.subject,
        student_id=student.id,
        student_name=student.name,
        registration_number=student.registration_number,
        student_enrollment_number=enrollment_num,
        session_id=session.id,
        attempt_number=attempt_num,
        total_questions=len(paper_q_ids),
        attempted_questions=attempted_count,
        correct_answers=correct_count,
        incorrect_answers=incorrect_count,
        unanswered_questions=unanswered_count,
        total_marks=final_score,
        negative_marks_deducted=total_negative_deducted,
        maximum_marks=exam.maximum_marks,
        percentage=percentage,
        passed=passed,
        status=result.status,
        result_status=result.status,
        submission_status=sub_status,
        submission_reason=sub_reason,
        suspicion_score=session_suspicion,
        submitted_at=now,
        breakdown=breakdown
    )

def check_session_heartbeat(
    db: Session,
    session_id: int,
    student: User
) -> SessionHeartbeatResponse:
    """Server-authoritative heartbeat check. Syncs timer and detects expiration or violation termination."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    violation_count = (
        db.query(ProctorEvent)
        .filter(
            ProctorEvent.session_id == session_id,
            ProctorEvent.event_type.in_(VIOLATION_EVENT_TYPES),
            ProctorEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])
        )
        .count()
    )

    existing_result = db.query(Result).filter(Result.session_id == session_id).first()

    if session.status != "ACTIVE":
        if session.status == "CAMERA_PAUSED":
            pause_event = (
                db.query(ProctorEvent)
                .filter(ProctorEvent.session_id == session.id, ProctorEvent.event_type == "EXAM_CAMERA_PAUSED")
                .order_by(ProctorEvent.id.desc())
                .first()
            )
            pause_time = ensure_utc(pause_event.created_at) if pause_event else datetime.now(timezone.utc)
            started_at = ensure_utc(session.started_at)
            deadline = min(started_at + timedelta(minutes=session.exam.duration_minutes), ensure_utc(session.exam.end_time))
            remaining = max(0, int((deadline - pause_time).total_seconds()))
            return SessionHeartbeatResponse(
                session_id=session.id,
                status="CAMERA_PAUSED",
                remaining_seconds=remaining,
                tab_switch_count=violation_count,
                auto_submitted=False,
                result_id=None,
                submission_reason=None,
                suspicion_score=session.suspicion_score or 0.0
            )

        sub_reason = "Maximum proctoring violations reached" if session.status == "SUBMITTED_VIOLATION" else (
            "Examination time expired" if session.status in ["TIME_EXPIRED", "EXPIRED"] else "Candidate manually submitted"
        )
        return SessionHeartbeatResponse(
            session_id=session.id,
            status=session.status,
            remaining_seconds=0,
            tab_switch_count=violation_count,
            auto_submitted=True,
            result_id=existing_result.id if existing_result else None,
            submission_reason=sub_reason,
            suspicion_score=session.suspicion_score or 0.0
        )

    # Calculate authoritative remaining time from server started_at + duration_minutes
    exam = session.exam
    now = datetime.now(timezone.utc)
    started_at = ensure_utc(session.started_at)
    deadline = min(started_at + timedelta(minutes=exam.duration_minutes), ensure_utc(exam.end_time))
    remaining = max(0, int((deadline - now).total_seconds()))

    if remaining <= 0:
        # Server authoritative expiration
        sub_res = finalize_and_grade_session(db, session_id, student, auto_reason="TIME_EXPIRED")
        return SessionHeartbeatResponse(
            session_id=session.id,
            status="TIME_EXPIRED",
            remaining_seconds=0,
            tab_switch_count=violation_count,
            auto_submitted=True,
            result_id=sub_res.result_id,
            submission_reason="Examination time expired",
            suspicion_score=session.suspicion_score or 0.0
        )

    return SessionHeartbeatResponse(
        session_id=session.id,
        status="ACTIVE",
        remaining_seconds=remaining,
        tab_switch_count=violation_count,
        auto_submitted=False,
        result_id=None,
        submission_reason=None,
        suspicion_score=session.suspicion_score or 0.0
    )


def pause_exam_session(
    db: Session,
    session_id: int,
    student: User
) -> Dict[str, Any]:
    """Pause an active exam session due to camera disconnection. Freezes timer and records proctor events."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    now = datetime.now(timezone.utc)

    if session.status == "CAMERA_PAUSED":
        pause_event = (
            db.query(ProctorEvent)
            .filter(ProctorEvent.session_id == session.id, ProctorEvent.event_type == "EXAM_CAMERA_PAUSED")
            .order_by(ProctorEvent.id.desc())
            .first()
        )
        pause_time = ensure_utc(pause_event.created_at) if pause_event else now
        started_at = ensure_utc(session.started_at)
        deadline = min(started_at + timedelta(minutes=session.exam.duration_minutes), ensure_utc(session.exam.end_time))
        remaining = max(0, int((deadline - pause_time).total_seconds()))
        return {
            "session_id": session.id,
            "status": "CAMERA_PAUSED",
            "remaining_seconds": remaining,
            "paused_at": pause_time,
            "message": "Exam session is already paused."
        }

    if session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause session in status '{session.status}'."
        )

    started_at = ensure_utc(session.started_at)
    deadline = min(started_at + timedelta(minutes=session.exam.duration_minutes), ensure_utc(session.exam.end_time))
    remaining = max(0, int((deadline - now).total_seconds()))

    session.status = "CAMERA_PAUSED"

    cam_disc_event = ProctorEvent(
        session_id=session.id,
        event_type="CAMERA_DISCONNECTED",
        event_data={"paused_at": now.isoformat(), "remaining_seconds": remaining},
        severity="MEDIUM"
    )
    exam_pause_event = ProctorEvent(
        session_id=session.id,
        event_type="EXAM_CAMERA_PAUSED",
        event_data={"paused_at": now.isoformat(), "remaining_seconds": remaining},
        severity="MEDIUM"
    )
    db.add(cam_disc_event)
    db.add(exam_pause_event)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "status": "CAMERA_PAUSED",
        "remaining_seconds": remaining,
        "paused_at": now,
        "message": "Exam session paused due to camera disconnection."
    }


def resume_exam_session(
    db: Session,
    session_id: int,
    student: User
) -> Dict[str, Any]:
    """Resume a camera-paused exam session. Shifts started_at forward so disconnect time is not penalized."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    now = datetime.now(timezone.utc)

    if session.status == "ACTIVE":
        started_at = ensure_utc(session.started_at)
        deadline = min(started_at + timedelta(minutes=session.exam.duration_minutes), ensure_utc(session.exam.end_time))
        remaining = max(0, int((deadline - now).total_seconds()))
        return {
            "session_id": session.id,
            "status": "ACTIVE",
            "remaining_seconds": remaining,
            "message": "Exam session is already active."
        }

    if session.status != "CAMERA_PAUSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume session in status '{session.status}'."
        )

    pause_event = (
        db.query(ProctorEvent)
        .filter(ProctorEvent.session_id == session.id, ProctorEvent.event_type == "EXAM_CAMERA_PAUSED")
        .order_by(ProctorEvent.id.desc())
        .first()
    )

    pause_duration = 0.0
    if pause_event:
        paused_at = ensure_utc(pause_event.created_at)
        pause_duration = max(0.0, (now - paused_at).total_seconds())

    old_started = ensure_utc(session.started_at)
    session.started_at = old_started + timedelta(seconds=pause_duration)
    session.status = "ACTIVE"

    cam_rec_event = ProctorEvent(
        session_id=session.id,
        event_type="CAMERA_RECONNECTED",
        event_data={"resumed_at": now.isoformat()},
        severity="LOW"
    )
    exam_res_event = ProctorEvent(
        session_id=session.id,
        event_type="EXAM_CAMERA_RESUMED",
        event_data={"resumed_at": now.isoformat(), "pause_duration_seconds": round(pause_duration, 2)},
        severity="LOW"
    )
    db.add(cam_rec_event)
    db.add(exam_res_event)
    db.commit()
    db.refresh(session)

    started_at = ensure_utc(session.started_at)
    deadline = min(started_at + timedelta(minutes=session.exam.duration_minutes), ensure_utc(session.exam.end_time))
    remaining = max(0, int((deadline - now).total_seconds()))

    return {
        "session_id": session.id,
        "status": "ACTIVE",
        "remaining_seconds": remaining,
        "message": "Exam session resumed successfully."
    }
