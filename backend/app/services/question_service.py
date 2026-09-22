from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.models.exam import ExamQuestion
from app.schemas.question import QuestionCreate, QuestionUpdate, OptionCreate

def validate_question_data(
    question_type: QuestionType,
    marks: float,
    negative_marks: float,
    options: Optional[List[OptionCreate]],
    question_text: Optional[str] = None
):
    """Validate business rules for question types, options, and IMAGE_UPLOAD rubric."""
    if marks <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Marks must be greater than zero."
        )
    if marks > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Marks cannot exceed 100."
        )
    if negative_marks < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Negative marks cannot be less than zero."
        )

    if question_type == QuestionType.MCQ:
        if not options or len(options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MCQ questions must have at least 2 options."
            )
        correct_count = sum(1 for opt in options if opt.is_correct)
        if correct_count != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MCQ questions must have exactly 1 correct option. Found: {correct_count}."
            )

    elif question_type == QuestionType.MULTI_SELECT:
        if not options or len(options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MULTI_SELECT questions must have at least 2 options."
            )
        correct_count = sum(1 for opt in options if opt.is_correct)
        if correct_count < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MULTI_SELECT questions must have at least 2 correct options. Found: {correct_count}."
            )

    elif question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD]:
        if options and len(options) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{question_type.value} questions do not accept options."
            )
        if question_type == QuestionType.IMAGE_UPLOAD:
            if marks <= 0 or marks > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IMAGE_UPLOAD marks must be between 1 and 100."
                )
            if question_text is not None and len(question_text.strip()) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IMAGE_UPLOAD question must have a valid descriptive prompt."
                )

def create_question(db: Session, question_in: QuestionCreate, creator_id: int) -> QuestionBank:
    """Create a new question with options in the question bank."""
    validate_question_data(
        question_in.question_type,
        question_in.marks,
        question_in.negative_marks,
        question_in.options,
        question_text=question_in.question_text
    )

    db_question = QuestionBank(
        subject=question_in.subject,
        topic=question_in.topic,
        subtopic=question_in.subtopic,
        question_text=question_in.question_text,
        question_type=question_in.question_type,
        difficulty=question_in.difficulty,
        marks=question_in.marks,
        negative_marks=question_in.negative_marks,
        expected_answer=question_in.expected_answer,
        model_answer=question_in.model_answer,
        explanation=question_in.explanation,
        tags=question_in.tags,
        is_active=question_in.is_active,
        created_by=creator_id
    )
    db.add(db_question)
    db.flush()

    if question_in.options and question_in.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
        for idx, opt in enumerate(question_in.options):
            db_option = Option(
                question_id=db_question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                option_order=opt.option_order if opt.option_order else idx
            )
            db.add(db_option)

    db.commit()
    db.refresh(db_question)
    return db_question

def update_question(db: Session, question_id: int, question_in: QuestionUpdate) -> QuestionBank:
    """Update an existing question and its options safely."""
    db_question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    target_type = question_in.question_type or db_question.question_type
    target_marks = question_in.marks if question_in.marks is not None else db_question.marks
    target_negative = question_in.negative_marks if question_in.negative_marks is not None else db_question.negative_marks

    # Determine target options for validation
    if question_in.options is not None:
        target_options = [
            OptionCreate(
                option_text=o.option_text,
                is_correct=o.is_correct,
                option_order=o.option_order
            ) for o in question_in.options
        ]
    else:
        target_options = [
            OptionCreate(
                option_text=o.option_text,
                is_correct=o.is_correct,
                option_order=o.option_order
            ) for o in db_question.options
        ]

    target_text = question_in.question_text if question_in.question_text is not None else db_question.question_text
    validate_question_data(target_type, target_marks, target_negative, target_options, question_text=target_text)

    # Update question fields
    update_data = question_in.model_dump(exclude_unset=True, exclude={"options"})
    for field, value in update_data.items():
        setattr(db_question, field, value)

    # Update options if provided
    if question_in.options is not None:
        # Clear existing options
        db.query(Option).filter(Option.question_id == question_id).delete()
        db.flush()
        if target_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            for idx, opt in enumerate(question_in.options):
                db_opt = Option(
                    question_id=question_id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    option_order=opt.option_order if opt.option_order else idx
                )
                db.add(db_opt)

    db.commit()
    db.refresh(db_question)
    return db_question

def delete_question(db: Session, question_id: int) -> bool:
    """Safely delete a question, preventing deletion if assigned to an exam."""
    db_question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    # Check if used in any exam
    is_used = db.query(ExamQuestion).filter(ExamQuestion.question_id == question_id).first()
    if is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete question (ID: {question_id}) because it is actively assigned to one or more exams."
        )

    db.delete(db_question)
    db.commit()
    return True
