import io
import csv
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from app.models.question import QuestionBank, QuestionType, DifficultyLevel

def generate_questions_csv_template() -> str:
    """Generate sample CSV template with header row and two demonstration rows."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "subject",
        "question_text",
        "question_type",
        "difficulty",
        "marks",
        "negative_marks",
        "option_1",
        "option_1_correct",
        "option_2",
        "option_2_correct",
        "option_3",
        "option_3_correct",
        "option_4",
        "option_4_correct",
        "expected_answer",
        "model_answer"
    ])
    # Sample Row 1: Valid MCQ
    writer.writerow([
        "Computer Science",
        "What does CPU stand for?",
        "MCQ",
        "EASY",
        "2.0",
        "0.5",
        "Central Processing Unit",
        "TRUE",
        "Central Performance Unit",
        "FALSE",
        "Compute Power Unit",
        "FALSE",
        "Control Processing Unit",
        "FALSE",
        "",
        ""
    ])
    # Sample Row 2: Valid Multi-Select
    writer.writerow([
        "Computer Science",
        "Which of the following are compiled programming languages?",
        "MULTI_SELECT",
        "MEDIUM",
        "3.0",
        "1.0",
        "Rust",
        "TRUE",
        "C++",
        "TRUE",
        "HTML",
        "FALSE",
        "CSS",
        "FALSE",
        "",
        ""
    ])
    return output.getvalue()

def export_questions_to_csv(questions: List[QuestionBank]) -> str:
    """Export question bank list into standard CSV format."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "subject",
        "question_text",
        "question_type",
        "difficulty",
        "marks",
        "negative_marks",
        "options",
        "expected_answer"
    ])
    for q in questions:
        opts_str = "; ".join([f"{o.option_text}{' [CORRECT]' if o.is_correct else ''}" for o in q.options])
        writer.writerow([
            q.id,
            q.subject,
            q.question_text,
            q.question_type.value,
            q.difficulty.value,
            q.marks,
            q.negative_marks,
            opts_str,
            q.expected_answer or ""
        ])
    return output.getvalue()

def export_questions_to_pdf(questions: List[QuestionBank]) -> bytes:
    """Generate a clean, styled PDF document of questions using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#6E2638")
    )
    q_style = ParagraphStyle(
        "QuestionText",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#252528")
    )
    meta_style = ParagraphStyle(
        "QuestionMeta",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#737177")
    )

    elements = [
        Paragraph("<b>IntelliExamAI — Question Bank Repository</b>", title_style),
        Paragraph(f"Generated Catalog: {len(questions)} Question(s)", meta_style),
        Spacer(1, 16)
    ]

    for idx, q in enumerate(questions, 1):
        meta_text = f"<b>#{idx}</b> | Subject: {q.subject} | Type: {q.question_type.value} | Difficulty: {q.difficulty.value} | Marks: {q.marks} pts (Neg: {q.negative_marks})"
        elements.append(Paragraph(meta_text, meta_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"<b>Q:</b> {q.question_text}", q_style))

        if q.options:
            elements.append(Spacer(1, 4))
            for o in sorted(q.options, key=lambda x: x.option_order):
                correct_mark = " ✓" if o.is_correct else ""
                elements.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;• {o.option_text}{correct_mark}", q_style))

        elements.append(Spacer(1, 10))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self._download_ts = kwargs.pop("download_ts", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#6B6B76"))
        self.setStrokeColor(colors.HexColor("#EAE6DF"))
        self.setLineWidth(0.5)
        self.line(40, 32, letter[0] - 40, 32)
        footer_left = f"PDF Downloaded On: {getattr(self, '_download_ts', '')} | Downloaded By: Student"
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawString(40, 20, footer_left)
        self.drawRightString(letter[0] - 40, 20, page_text)
        self.drawCentredString(letter[0] / 2.0, 20, "IntelliExamAI Official Academic Transcript • Document Authenticated")
        self.restoreState()

def generate_student_result_pdf(result: Any, student: Any, exam: Any, downloaded_by: Any = None) -> bytes:
    """Generate official Student Examination Result Scorecard & Performance Transcript.
    Adheres strictly to modern academic styling, server-side timestamps, exact examiner remarks,
    and institutional Ivory/Charcoal/Saffron visual palette.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=36,
        bottomMargin=46
    )
    styles = getSampleStyleSheet()

    server_now = datetime.now(timezone.utc)
    download_ts_str = server_now.strftime("%Y-%m-%d %H:%M:%S UTC")

    brand_style = ParagraphStyle(
        "BrandHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#E06A26"),
        alignment=1,
        spaceAfter=2
    )
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#1C1C1F"),
        alignment=1,
        spaceAfter=3
    )
    sub_style = ParagraphStyle(
        "CertSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6B6B76"),
        alignment=1,
        spaceAfter=14
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1C1C1F"),
        spaceBefore=10,
        spaceAfter=5
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1C1C1F")
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1C1C1F")
    )
    table_cell_muted = ParagraphStyle(
        "TableCellMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#6B6B76")
    )

    elements = [
        Paragraph("INTELLIEXAMAI &bull; AI-BASED INTELLIGENT EXAMINATION PLATFORM", brand_style),
        Paragraph("OFFICIAL CANDIDATE EXAMINATION RESULT &amp; TRANSCRIPT", title_style),
        Paragraph("Institutional Academic Assessment Record &bull; Authoritative Performance Report", sub_style),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E06A26"), spaceBefore=0, spaceAfter=12)
    ]

    session = getattr(result, "session", None)
    answers = session.answers if session else []
    ans_map = {a.question_id: a for a in answers}

    # Attempt count
    from app.models.session import ExamSession
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        attempt_num = (
            db.query(ExamSession)
            .filter(ExamSession.exam_id == exam.id, ExamSession.student_id == student.id, ExamSession.id <= (session.id if session else 0))
            .count()
        ) or 1

        from app.services.paper_generator import generate_paper_for_student
        paper = generate_paper_for_student(db, exam.id, student.id, check_time_window=False)
        paper_q_ids = [q.id for q in paper.questions]
        questions_in_paper = db.query(QuestionBank).filter(QuestionBank.id.in_(paper_q_ids)).all() if paper_q_ids else []
    except Exception:
        attempt_num = 1
        questions_in_paper = []
    finally:
        db.close()

    is_passed = result.percentage >= 50.0
    outcome_str = "PASSED" if is_passed else "NEEDS IMPROVEMENT"
    outcome_color = colors.HexColor("#2B7853") if is_passed else colors.HexColor("#C85332")

    # Timestamps formatted
    created_ts = result.created_at.strftime("%Y-%m-%d") if result.created_at else "N/A"
    started_ts = session.started_at.strftime("%Y-%m-%d %H:%M:%S UTC") if session and session.started_at else "N/A"
    submitted_ts = session.submitted_at.strftime("%Y-%m-%d %H:%M:%S UTC") if session and session.submitted_at else "N/A"
    finalized_ts = result.evaluation_finalized_at.strftime("%Y-%m-%d %H:%M:%S UTC") if getattr(result, "evaluation_finalized_at", None) else submitted_ts
    published_ts = result.result_published_at.strftime("%Y-%m-%d %H:%M:%S UTC") if getattr(result, "result_published_at", None) else server_now.strftime("%Y-%m-%d %H:%M:%S UTC")

    reg_number = student.registration_number or (student.student_profile.enrollment_number if student.student_profile else "REG-UNASSIGNED")

    # 1. Candidate & Exam Information Table
    elements.append(Paragraph("1. Candidate &amp; Assessment Information", section_heading))
    candidate_table_data = [
        [
            Paragraph("<b>Candidate Name:</b>", table_cell),
            Paragraph(student.name, table_cell_bold),
            Paragraph("<b>Examination Title:</b>", table_cell),
            Paragraph(exam.name, table_cell_bold)
        ],
        [
            Paragraph("<b>Registration / Roll No:</b>", table_cell),
            Paragraph(reg_number, table_cell),
            Paragraph("<b>Curriculum / Subject:</b>", table_cell),
            Paragraph(exam.subject, table_cell)
        ],
        [
            Paragraph("<b>Candidate Email:</b>", table_cell),
            Paragraph(student.email, table_cell),
            Paragraph("<b>Examination ID:</b>", table_cell),
            Paragraph(f"EXAM-{exam.id:04d}", table_cell)
        ],
        [
            Paragraph("<b>Examination Date:</b>", table_cell),
            Paragraph(created_ts, table_cell),
            Paragraph("<b>Attempt Number:</b>", table_cell),
            Paragraph(f"Attempt #{attempt_num}", table_cell_bold)
        ],
        [
            Paragraph("<b>Session Started At:</b>", table_cell),
            Paragraph(started_ts, table_cell_muted),
            Paragraph("<b>Session Submitted At:</b>", table_cell),
            Paragraph(submitted_ts, table_cell_muted)
        ]
    ]

    t_cand = Table(candidate_table_data, colWidths=[120, 150, 110, 152])
    t_cand.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FAF8F5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#EAE6DF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t_cand)
    elements.append(Spacer(1, 10))

    # 2. Performance & Evaluation Summary
    elements.append(Paragraph("2. Performance &amp; Evaluation Summary", section_heading))

    objective_count = sum(1 for q in questions_in_paper if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT])
    subjective_count = sum(1 for q in questions_in_paper if q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD])
    total_q_count = len(questions_in_paper) if questions_in_paper else 1

    # Compute negative deducted
    negative_deducted = 0.0
    for ans in answers:
        if ans.marks_awarded is not None and ans.marks_awarded < 0:
            negative_deducted += abs(ans.marks_awarded)

    eval_status_str = getattr(result, "evaluation_status", None) or "PUBLISHED"

    perf_headers = ["Maximum Marks", "Obtained Marks", "Percentage", "Outcome", "Negative Deduction", "Evaluation Status"]
    perf_values = [
        f"{result.maximum_marks:.1f}",
        f"{result.total_marks:.1f}",
        f"{result.percentage:.1f}%",
        outcome_str,
        f"-{negative_deducted:.1f}" if negative_deducted > 0 else "0.0",
        eval_status_str
    ]

    t_perf = Table([perf_headers, perf_values], colWidths=[88, 88, 88, 100, 88, 80])
    t_perf.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1C1C1F")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#FAF8F5")),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#FFFFFF")),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor("#1C1C1F")),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 9),
        ('TEXTCOLOR', (3, 1), (3, 1), outcome_color),
        ('TEXTCOLOR', (1, 1), (1, 1), colors.HexColor("#E06A26")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1C1C1F")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
        ('TOPPADDING', (0, 1), (-1, 1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
    ]))
    elements.append(t_perf)
    elements.append(Spacer(1, 10))

    # 3. Itemized Question Results Table
    elements.append(Paragraph(f"3. Itemized Question Evaluation ({total_q_count} Items: {objective_count} Objective, {subjective_count} Subjective)", section_heading))

    q_table_data = [
        ["#", "Question Type", "Question Statement Summary", "Max Marks", "Marks Awarded", "Evaluation Status"]
    ]

    for idx, q in enumerate(questions_in_paper, 1):
        ans = ans_map.get(q.id)
        q_type_str = q.question_type.value.replace("_", " ")
        q_text_snippet = (q.question_text[:72] + "...") if len(q.question_text) > 75 else q.question_text
        awarded_str = f"{ans.marks_awarded:.1f}" if (ans and ans.marks_awarded is not None) else "0.0"

        status_flag = "Evaluated"
        if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            status_flag = "Auto Evaluated"
        elif ans and getattr(ans, "is_evaluated", False):
            status_flag = "Faculty Graded"

        q_table_data.append([
            f"Q{idx}",
            q_type_str,
            q_text_snippet,
            f"{q.marks:.1f}",
            awarded_str,
            status_flag
        ])

    t_questions = Table(q_table_data, colWidths=[28, 85, 239, 55, 60, 65])
    t_questions.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#242428")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#FAF8F5")),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (4, -1), 'CENTER'),
        ('ALIGN', (5, 0), (5, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#DFD9CF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
    ]))
    elements.append(t_questions)
    elements.append(Spacer(1, 10))

    # 4. Examiner Remarks & Attestation Section
    elements.append(Paragraph("4. Evaluator Remarks &amp; Official Declaration", section_heading))

    remarks_text = result.evaluator_remarks.strip() if getattr(result, "evaluator_remarks", None) and result.evaluator_remarks.strip() else "No additional remarks provided."

    evaluator_name = "Institutional Board of Faculty Examiners"
    evaluator_role = "ACADEMIC EXAMINER"
    if getattr(result, "evaluator", None):
        evaluator_name = result.evaluator.name
        evaluator_role = result.evaluator.role.value if hasattr(result.evaluator.role, "value") else str(result.evaluator.role)

    remarks_data = [
        [
            Paragraph("<b>Official Evaluator Remarks:</b>", table_cell),
            Paragraph(f"<i>&ldquo;{remarks_text}&rdquo;</i>", table_cell)
        ],
        [
            Paragraph("<b>Evaluated / Finalized By:</b>", table_cell),
            Paragraph(f"{evaluator_name} &bull; <font color='#6B6B76'>({evaluator_role})</font>", table_cell)
        ],
        [
            Paragraph("<b>Evaluation Finalized On:</b>", table_cell),
            Paragraph(f"<font color='#1C1C1F'>{finalized_ts}</font>", table_cell)
        ],
        [
            Paragraph("<b>Result Officially Published On:</b>", table_cell),
            Paragraph(f"<font color='#2B7853'><b>{published_ts}</b></font>", table_cell)
        ]
    ]

    t_remarks = Table(remarks_data, colWidths=[150, 382])
    t_remarks.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FAF8F5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#EAE6DF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t_remarks)
    elements.append(Spacer(1, 10))

    # 5. Attestation Note
    attest_para = Paragraph(
        "<b>Institutional Declaration:</b> This transcript is generated directly from the IntelliExamAI secure examination repository. "
        "All candidate responses were logged under verified proctoring conditions and evaluated in compliance with academic grading standards. "
        "Marks recorded herein are authoritative and final.",
        ParagraphStyle("Attest", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=9.5, textColor=colors.HexColor("#6B6B76"))
    )
    elements.append(attest_para)

    # Canvasmaker with server timestamp injection
    def make_canvas(*args, **kwargs):
        c = NumberedCanvas(*args, **kwargs)
        c._download_ts = download_ts_str
        return c

    doc.build(elements, canvasmaker=make_canvas)
    buffer.seek(0)
    return buffer.getvalue()


def export_results_csv(results: List[Any]) -> str:
    """Export exam candidate scores and metrics into standard CSV format."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "result_id",
        "exam_id",
        "exam_name",
        "student_id",
        "student_name",
        "registration_number",
        "total_marks",
        "maximum_marks",
        "percentage",
        "status",
        "created_at"
    ])
    for r in results:
        status_str = "PASSED" if r.percentage >= 50.0 else "FAILED"
        writer.writerow([
            r.id,
            r.exam_id,
            r.exam.name if r.exam else "",
            r.student_id,
            r.student.name if r.student else "",
            r.student.registration_number if r.student else "",
            r.total_marks,
            r.maximum_marks,
            r.percentage,
            status_str,
            r.created_at.isoformat() if r.created_at else ""
        ])
    return output.getvalue()

def export_questions_to_excel(questions: List[QuestionBank]) -> bytes:
    """Generate a styled Excel workbook containing question bank records."""
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Question Bank"

    headers = [
        "id", "subject", "topic", "subtopic", "question_text", "question_type",
        "difficulty", "marks", "negative_marks", "options", "correct_answer",
        "expected_answer", "explanation", "tags"
    ]
    ws.append(headers)

    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for row_idx, q in enumerate(questions, start=2):
        opts_list = sorted(q.options, key=lambda x: x.option_order)
        opts_str = "; ".join([f"{o.option_text}{' [CORRECT]' if o.is_correct else ''}" for o in opts_list])
        corr_opts = ", ".join([o.option_text for o in opts_list if o.is_correct])

        row_vals = [
            q.id,
            q.subject,
            q.topic or "",
            q.subtopic or "",
            q.question_text,
            q.question_type.value,
            q.difficulty.value,
            q.marks,
            q.negative_marks,
            opts_str,
            corr_opts,
            q.expected_answer or "",
            q.explanation or "",
            q.tags or ""
        ]
        ws.append(row_vals)

        # Alternating row fill & borders
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            if row_idx % 2 == 1:
                cell.fill = alt_fill

    # Column widths auto-fit
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()

def export_questions_to_docx(questions: List[QuestionBank]) -> bytes:
    """Generate a clean Microsoft Word (.docx) document of the Question Bank."""
    import docx
    from docx.shared import Inches, Pt, RGBColor

    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    title_p = doc.add_paragraph()
    r_title = title_p.add_run("IntelliExamAI — Question Bank Repository")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(18)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    sub_p = doc.add_paragraph()
    r_sub = sub_p.add_run(f"Exported Catalog: {len(questions)} Question(s) | Generated from Institutional Repository")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(9.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    for idx, q in enumerate(questions, 1):
        p_meta = doc.add_paragraph()
        p_meta.paragraph_format.space_before = Pt(8)
        p_meta.paragraph_format.space_after = Pt(2)
        r_meta = p_meta.add_run(
            f"#{idx} | Subject: {q.subject} | Type: {q.question_type.value} | "
            f"Difficulty: {q.difficulty.value} | Marks: {q.marks} pts (Penalty: -{q.negative_marks})"
        )
        r_meta.font.bold = True
        r_meta.font.size = Pt(8.5)
        r_meta.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_after = Pt(4)
        r_q = p_q.add_run(f"Q: {q.question_text}")
        r_q.font.bold = True
        r_q.font.size = Pt(10)
        r_q.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

        if q.options:
            opts_list = sorted(q.options, key=lambda x: x.option_order)
            for opt in opts_list:
                p_opt = doc.add_paragraph()
                p_opt.paragraph_format.left_indent = Inches(0.25)
                p_opt.paragraph_format.space_after = Pt(2)
                check_mark = " ✓ [CORRECT]" if opt.is_correct else ""
                r_opt = p_opt.add_run(f"• {opt.option_text}{check_mark}")
                r_opt.font.size = Pt(9)
                if opt.is_correct:
                    r_opt.font.bold = True
                    r_opt.font.color.rgb = RGBColor(0x16, 0xA3, 0x4A)
                else:
                    r_opt.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

        if q.explanation:
            p_exp = doc.add_paragraph()
            p_exp.paragraph_format.left_indent = Inches(0.25)
            p_exp.paragraph_format.space_after = Pt(4)
            r_exp = p_exp.add_run(f"Explanation: {q.explanation}")
            r_exp.font.italic = True
            r_exp.font.size = Pt(8.5)
            r_exp.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()

def export_questions_to_json(questions: List[QuestionBank]) -> str:
    """Export question bank list into structured JSON format."""
    import json
    data = []
    for q in questions:
        opts_list = sorted(q.options, key=lambda x: x.option_order)
        data.append({
            "id": q.id,
            "subject": q.subject,
            "topic": q.topic,
            "subtopic": q.subtopic,
            "question_text": q.question_text,
            "question_type": q.question_type.value,
            "difficulty": q.difficulty.value,
            "marks": q.marks,
            "negative_marks": q.negative_marks,
            "options": [
                {
                    "option_text": o.option_text,
                    "is_correct": o.is_correct,
                    "option_order": o.option_order
                }
                for o in opts_list
            ],
            "expected_answer": q.expected_answer,
            "model_answer": q.model_answer,
            "explanation": q.explanation,
            "tags": q.tags
        })
    return json.dumps(data, indent=2)

def generate_questions_excel_template() -> bytes:
    """Generate downloadable Excel (.xlsx) template with headers and demo rows."""
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Import Template"

    headers = [
        "subject", "topic", "subtopic", "question_text", "question_type",
        "difficulty", "marks", "negative_marks", "option_1", "option_1_correct",
        "option_2", "option_2_correct", "option_3", "option_3_correct",
        "option_4", "option_4_correct", "expected_answer", "explanation", "tags"
    ]
    ws.append(headers)

    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Sample Row 1: MCQ
    ws.append([
        "Computer Science", "Architecture", "Processors", "What does CPU stand for?",
        "MCQ", "EASY", 2.0, 0.5,
        "Central Processing Unit", "TRUE",
        "Central Performance Unit", "FALSE",
        "Computer Power Unit", "FALSE",
        "Control Processing Unit", "FALSE",
        "", "CPU is the primary execution unit of a computer.", "hardware;fundamentals"
    ])

    # Sample Row 2: Multi-Select
    ws.append([
        "Computer Science", "Programming", "Languages", "Which of the following are compiled programming languages?",
        "MULTI_SELECT", "MEDIUM", 3.0, 1.0,
        "Rust", "TRUE",
        "C++", "TRUE",
        "HTML", "FALSE",
        "CSS", "FALSE",
        "", "Rust and C++ are natively compiled ahead-of-time languages.", "coding;compilers"
    ])

    # Sample Row 3: Short Answer
    ws.append([
        "Physics", "Mechanics", "Dynamics", "State Newton's second law of motion in terms of force, mass, and acceleration.",
        "SHORT_ANSWER", "MEDIUM", 4.0, 0.0,
        "", "", "", "", "", "", "", "",
        "F = ma. Force equals mass times acceleration.", "The net force applied to a body is equal to mass multiplied by acceleration.", "mechanics;physics"
    ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, 12), 35)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()

def generate_questions_json_template() -> str:
    """Generate sample JSON template string."""
    import json
    template_data = [
        {
            "subject": "Computer Science",
            "topic": "Architecture",
            "question_text": "What does CPU stand for?",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 2.0,
            "negative_marks": 0.5,
            "options": [
                {"option_text": "Central Processing Unit", "is_correct": True},
                {"option_text": "Central Performance Unit", "is_correct": False},
                {"option_text": "Computer Power Unit", "is_correct": False},
                {"option_text": "Control Processing Unit", "is_correct": False}
            ],
            "explanation": "CPU is the primary computational core of a computing system."
        },
        {
            "subject": "Computer Science",
            "topic": "Programming",
            "question_text": "Which of the following are compiled programming languages?",
            "question_type": "MULTI_SELECT",
            "difficulty": "MEDIUM",
            "marks": 3.0,
            "negative_marks": 1.0,
            "options": [
                {"option_text": "Rust", "is_correct": True},
                {"option_text": "C++", "is_correct": True},
                {"option_text": "HTML", "is_correct": False},
                {"option_text": "CSS", "is_correct": False}
            ],
            "explanation": "Rust and C++ compile to native machine binaries."
        }
    ]
    return json.dumps(template_data, indent=2)

def generate_questions_docx_template() -> bytes:
    """Generate sample Word (.docx) import template with instructions and tables."""
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.table import WD_TABLE_ALIGNMENT

    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    title_p = doc.add_paragraph()
    r = title_p.add_run("IntelliExamAI — Question Import Template (.docx)")
    r.font.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    p_desc = doc.add_paragraph()
    r_desc = p_desc.add_run(
        "Instructions: You can format questions using the table below or simple numbered paragraphs. "
        "For MCQs, denote correct options with '[CORRECT]'. Semicolons separate options in table mode."
    )
    r_desc.font.size = Pt(9.5)
    r_desc.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Add sample table
    table = doc.add_table(rows=3, cols=6)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Subject", "Question Text", "Type", "Difficulty", "Marks", "Options"]
    for idx, h in enumerate(headers):
        cell = table.cell(0, idx)
        p = cell.paragraphs[0]
        r_h = p.add_run(h)
        r_h.font.bold = True
        r_h.font.size = Pt(9)

    # Row 1
    r1 = ["Computer Science", "What does CPU stand for?", "MCQ", "EASY", "2.0", "Central Processing Unit [CORRECT]; Central Performance Unit; Compute Power Unit; Control Processing Unit"]
    for idx, val in enumerate(r1):
        table.cell(1, idx).paragraphs[0].add_run(val).font.size = Pt(8.5)

    # Row 2
    r2 = ["Computer Science", "Which are compiled languages?", "MULTI_SELECT", "MEDIUM", "3.0", "Rust [CORRECT]; C++ [CORRECT]; HTML; CSS"]
    for idx, val in enumerate(r2):
        table.cell(2, idx).paragraphs[0].add_run(val).font.size = Pt(8.5)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()

