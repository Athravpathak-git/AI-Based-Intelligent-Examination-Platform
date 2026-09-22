import io
import csv
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, require_examiner_or_admin
from app.models.user import User
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionResponse,
    QuestionImportPreviewResponse, QuestionImportConfirmRequest, QuestionImportConfirmResponse
)
from app.services.question_service import create_question, update_question, delete_question
from app.services.report_service import (
    generate_questions_csv_template,
    export_questions_to_csv,
    export_questions_to_pdf,
    export_questions_to_excel,
    export_questions_to_docx,
    export_questions_to_json,
    generate_questions_excel_template,
    generate_questions_json_template,
    generate_questions_docx_template
)
from app.services.question_parser_service import (
    parse_file,
    validate_and_preview_questions,
    commit_import_questions
)

router = APIRouter(prefix="/questions", tags=["Question Bank"])

@router.get("/template/csv")
def api_download_questions_csv_template(
    current_user: User = Depends(require_examiner_or_admin)
):
    """Download a pre-formatted CSV template with demo rows for question import."""
    csv_content = generate_questions_csv_template()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=question_bank_template.csv"}
    )

@router.get("/template/excel")
def api_download_questions_excel_template(
    current_user: User = Depends(require_examiner_or_admin)
):
    """Download a pre-formatted Excel (.xlsx) template with demo rows for question import."""
    xlsx_bytes = generate_questions_excel_template()
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=question_bank_template.xlsx"}
    )

@router.get("/template/json")
def api_download_questions_json_template(
    current_user: User = Depends(require_examiner_or_admin)
):
    """Download a sample JSON template for question import."""
    json_str = generate_questions_json_template()
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=question_bank_template.json"}
    )

@router.get("/template/docx")
def api_download_questions_docx_template(
    current_user: User = Depends(require_examiner_or_admin)
):
    """Download a sample Word (.docx) template for question import."""
    docx_bytes = generate_questions_docx_template()
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=question_bank_template.docx"}
    )

@router.get("/export/csv")
def api_export_questions_csv(
    subject: Optional[str] = Query(None),
    difficulty: Optional[DifficultyLevel] = Query(None),
    question_type: Optional[QuestionType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export Question Bank matching filters into downloadable CSV."""
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject.strip()}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)

    questions = query.order_by(QuestionBank.id.asc()).all()
    csv_content = export_questions_to_csv(questions)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=question_bank_export.csv"}
    )

@router.get("/export/excel")
def api_export_questions_excel(
    subject: Optional[str] = Query(None),
    difficulty: Optional[DifficultyLevel] = Query(None),
    question_type: Optional[QuestionType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export Question Bank matching filters into downloadable Excel (.xlsx)."""
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject.strip()}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)

    questions = query.order_by(QuestionBank.id.asc()).all()
    xlsx_bytes = export_questions_to_excel(questions)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=question_bank_export.xlsx"}
    )

@router.get("/export/docx")
def api_export_questions_docx(
    subject: Optional[str] = Query(None),
    difficulty: Optional[DifficultyLevel] = Query(None),
    question_type: Optional[QuestionType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export Question Bank matching filters into downloadable Word (.docx)."""
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject.strip()}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)

    questions = query.order_by(QuestionBank.id.asc()).all()
    docx_bytes = export_questions_to_docx(questions)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=question_bank_catalog.docx"}
    )

@router.get("/export/json")
def api_export_questions_json(
    subject: Optional[str] = Query(None),
    difficulty: Optional[DifficultyLevel] = Query(None),
    question_type: Optional[QuestionType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export Question Bank matching filters into downloadable JSON format."""
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject.strip()}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)

    questions = query.order_by(QuestionBank.id.asc()).all()
    json_str = export_questions_to_json(questions)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=question_bank_export.json"}
    )

@router.get("/export/pdf")
def api_export_questions_pdf(
    subject: Optional[str] = Query(None),
    difficulty: Optional[DifficultyLevel] = Query(None),
    question_type: Optional[QuestionType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export Question Bank matching filters into downloadable formatted PDF."""
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject.strip()}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)

    questions = query.order_by(QuestionBank.id.asc()).all()
    pdf_bytes = export_questions_to_pdf(questions)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=question_bank_catalog.pdf"}
    )

@router.post("/import/preview", response_model=QuestionImportPreviewResponse)
async def api_import_questions_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """
    Parse uploaded file (CSV, XLSX, JSON, DOCX, PDF, or Image) and return row-by-row
    validation and duplicate preview without modifying the database.
    """
    content = await file.read()
    raw_questions, file_type, warnings = parse_file(content, file.filename, file.content_type)
    preview = validate_and_preview_questions(raw_questions, db, current_user.id, initial_warnings=warnings)
    preview["filename"] = file.filename
    preview["file_type"] = file_type
    return preview

@router.post("/import/confirm", response_model=QuestionImportConfirmResponse)
def api_import_questions_confirm(
    payload: QuestionImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """
    Commit confirmed questions into PostgreSQL. Optionally skips invalid or duplicate records.
    """
    q_dicts = [q.model_dump() for q in payload.questions]
    result = commit_import_questions(
        q_dicts,
        db,
        current_user.id,
        skip_invalid=payload.skip_invalid,
        allow_duplicates=payload.allow_duplicates
    )
    return result

@router.post("/import/csv")
async def api_import_questions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Import and validate questions from an uploaded CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV (.csv) file."
        )

    content = await file.read()
    try:
        decoded_file = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded_file = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded_file))
    imported_count = 0
    errors: List[str] = []

    for row_idx, row in enumerate(reader, start=2):
        subject = (row.get("subject") or "").strip()
        question_text = (row.get("question_text") or "").strip()
        q_type_str = (row.get("question_type") or "").strip().upper()
        diff_str = (row.get("difficulty") or "").strip().upper()
        marks_str = (row.get("marks") or "").strip()
        neg_str = (row.get("negative_marks") or "").strip() or "0"

        if not subject or not question_text:
            errors.append(f"Row {row_idx}: 'subject' and 'question_text' are required.")
            continue

        try:
            q_type = QuestionType(q_type_str)
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid question_type '{q_type_str}'.")
            continue

        try:
            diff = DifficultyLevel(diff_str)
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid difficulty '{diff_str}'.")
            continue

        try:
            marks = float(marks_str)
            if marks <= 0:
                raise ValueError()
        except ValueError:
            errors.append(f"Row {row_idx}: Marks must be a positive number.")
            continue

        try:
            neg_marks = float(neg_str)
            if neg_marks < 0:
                raise ValueError()
        except ValueError:
            errors.append(f"Row {row_idx}: Negative marks cannot be negative.")
            continue

        # Process options if applicable
        options_data = []
        if q_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            # Format 1: option_a, option_b, option_c, option_d with correct_options
            has_letter_options = any(row.get(f"option_{l}") for l in ["a", "b", "c", "d"])
            if has_letter_options:
                correct_letters = [c.strip().upper() for c in (row.get("correct_options") or "").replace(";", ",").split(",") if c.strip()]
                for idx, letter in enumerate(["a", "b", "c", "d"]):
                    opt_text = (row.get(f"option_{letter}") or "").strip()
                    if opt_text:
                        is_corr = letter.upper() in correct_letters
                        options_data.append({"option_text": opt_text, "is_correct": is_corr, "option_order": idx})
            else:
                # Format 2: option_1..9 with option_i_correct
                for i in range(1, 10):
                    opt_text = (row.get(f"option_{i}") or "").strip()
                    if opt_text:
                        corr_val = (row.get(f"option_{i}_correct") or "").strip().lower()
                        is_corr = corr_val in ["true", "1", "yes", "y", "correct"]
                        options_data.append({"option_text": opt_text, "is_correct": is_corr, "option_order": i - 1})

            if len(options_data) < 2:
                errors.append(f"Row {row_idx}: {q_type.value} questions require at least 2 options.")
                continue

            correct_count = sum(1 for o in options_data if o["is_correct"])
            if q_type == QuestionType.MCQ and correct_count != 1:
                errors.append(f"Row {row_idx}: MCQ must have exactly 1 correct option (found {correct_count}).")
                continue
            if q_type == QuestionType.MULTI_SELECT and correct_count < 2:
                errors.append(f"Row {row_idx}: Multi-Select questions must have at least 2 correct options (found {correct_count}).")
                continue

        # Create question
        db_q = QuestionBank(
            subject=subject,
            topic=(row.get("topic") or "").strip() or None,
            subtopic=(row.get("subtopic") or "").strip() or None,
            question_text=question_text,
            question_type=q_type,
            difficulty=diff,
            marks=marks,
            negative_marks=neg_marks,
            expected_answer=row.get("expected_answer"),
            model_answer=row.get("model_answer"),
            explanation=row.get("explanation"),
            tags=(row.get("tags") or "").strip() or None,
            is_active=True,
            created_by=current_user.id
        )
        db.add(db_q)
        db.flush()

        for opt in options_data:
            db.add(Option(
                question_id=db_q.id,
                option_text=opt["option_text"],
                is_correct=opt["is_correct"],
                option_order=opt["option_order"]
            ))

        imported_count += 1

    db.commit()
    return {
        "imported_count": imported_count,
        "error_count": len(errors),
        "errors": errors
    }

@router.get("/stats/summary")
def api_question_stats_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Return Question Bank aggregated statistics for dashboards."""
    total = db.query(QuestionBank).count()
    active = db.query(QuestionBank).filter(QuestionBank.is_active == True).count()
    mcq = db.query(QuestionBank).filter(QuestionBank.question_type == QuestionType.MCQ).count()
    multi = db.query(QuestionBank).filter(QuestionBank.question_type == QuestionType.MULTI_SELECT).count()
    short = db.query(QuestionBank).filter(QuestionBank.question_type == QuestionType.SHORT_ANSWER).count()
    long_q = db.query(QuestionBank).filter(QuestionBank.question_type == QuestionType.LONG_ANSWER).count()
    image = db.query(QuestionBank).filter(QuestionBank.question_type == QuestionType.IMAGE_UPLOAD).count()

    from sqlalchemy import func
    subject_counts = (
        db.query(QuestionBank.subject, func.count(QuestionBank.id))
        .filter(QuestionBank.is_active == True)
        .group_by(QuestionBank.subject)
        .all()
    )

    return {
        "total_questions": total,
        "active_questions": active,
        "mcq_count": mcq,
        "multi_select_count": multi,
        "short_answer_count": short,
        "long_answer_count": long_q,
        "image_upload_count": image,
        "by_subject": {s: cnt for s, cnt in subject_counts}
    }

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def api_create_question(
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Create a new question in the Question Bank (Examiner / Admin only)."""
    return create_question(db, question_in, creator_id=current_user.id)

@router.get("", response_model=List[QuestionResponse])
def api_list_questions(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    subtopic: Optional[str] = Query(None, description="Filter by subtopic"),
    difficulty: Optional[DifficultyLevel] = Query(None, description="Filter by difficulty"),
    question_type: Optional[QuestionType] = Query(None, description="Filter by question type"),
    search: Optional[str] = Query(None, description="Search in question text"),
    is_active: Optional[bool] = Query(None, description="Filter active status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=250, description="Items per page (25, 50, 100, 250)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """List and filter questions in the Question Bank (Examiner / Admin only)."""
    query = db.query(QuestionBank)

    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject.strip()}%"))
    if topic:
        query = query.filter(QuestionBank.topic.ilike(f"%{topic.strip()}%"))
    if subtopic:
        query = query.filter(QuestionBank.subtopic.ilike(f"%{subtopic.strip()}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)
    if is_active is not None:
        query = query.filter(QuestionBank.is_active == is_active)
    if search:
        query = query.filter(QuestionBank.question_text.ilike(f"%{search.strip()}%"))

    offset = (page - 1) * limit
    return query.order_by(QuestionBank.id.desc()).offset(offset).limit(limit).all()

@router.get("/{question_id}", response_model=QuestionResponse)
def api_get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Retrieve details of a single question by ID."""
    db_question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return db_question

@router.put("/{question_id}", response_model=QuestionResponse)
def api_update_question(
    question_id: int,
    question_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Update an existing question in the Question Bank."""
    return update_question(db, question_id, question_in)

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Delete a question from the Question Bank."""
    delete_question(db, question_id)
    return None
