import io
import re
import csv
import json
import logging
from typing import List, Dict, Any, Tuple, Optional, Set
from sqlalchemy.orm import Session
from PIL import Image
import pytesseract
import openpyxl
from pypdf import PdfReader
import docx

from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel

logger = logging.getLogger("question_parser_service")

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    ".csv": "CSV",
    ".xlsx": "EXCEL",
    ".xls": "EXCEL",
    ".json": "JSON",
    ".docx": "DOCX",
    ".pdf": "PDF",
    ".png": "IMAGE_OCR",
    ".jpg": "IMAGE_OCR",
    ".jpeg": "IMAGE_OCR",
    ".webp": "IMAGE_OCR"
}

def parse_unstructured_text(text: str) -> List[Dict[str, Any]]:
    """
    Smart regex tokenizer for extracting question structures from raw text
    (used by PDF, Word paragraphs, and OCR images).
    Detects question numbers, metadata headers, option lists, and answer keys.
    """
    questions: List[Dict[str, Any]] = []
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return questions

    # Split lines into question blocks using regex matching "1.", "Q1.", "Question 1:"
    block_starts: List[int] = []
    q_start_regex = re.compile(r"^(?:Q(?:uestion)?\s*(\d+)[:.]?|(\d+)[\.\)])\s+", re.IGNORECASE)

    for i, line in enumerate(lines):
        if q_start_regex.match(line):
            block_starts.append(i)

    # If no explicit numbered questions found, treat double-spaced or paragraphs as separate
    if not block_starts:
        block_starts = [0]

    blocks: List[List[str]] = []
    for idx, start_i in enumerate(block_starts):
        end_i = block_starts[idx + 1] if idx + 1 < len(block_starts) else len(lines)
        blocks.append(lines[start_i:end_i])

    for block_idx, b_lines in enumerate(blocks, start=1):
        if not b_lines:
            continue

        raw_q: Dict[str, Any] = {
            "row_index": block_idx,
            "subject": "",
            "topic": None,
            "subtopic": None,
            "question_text": "",
            "question_type": "MCQ",
            "difficulty": "MEDIUM",
            "marks": 1.0,
            "negative_marks": 0.0,
            "options": [],
            "expected_answer": None,
            "model_answer": None,
            "explanation": None,
            "tags": None
        }

        q_text_parts: List[str] = []
        option_lines: List[Tuple[str, str, bool]] = []  # (label, text, is_correct)
        correct_letters: Set[str] = set()

        opt_regex = re.compile(r"^[\(\[]?([A-Za-z])[\)\.\:]\s+(.*)$")
        opt_num_regex = re.compile(r"^\((\d+)\)\s+(.*)$")
        bullet_regex = re.compile(r"^[-*•]\s+(.*)$")

        for line in b_lines:
            lower = line.lower()

            # Metadata extraction
            if lower.startswith("subject:"):
                raw_q["subject"] = line.split(":", 1)[1].strip()
                continue
            if lower.startswith("topic:"):
                raw_q["topic"] = line.split(":", 1)[1].strip()
                continue
            if lower.startswith("subtopic:"):
                raw_q["subtopic"] = line.split(":", 1)[1].strip()
                continue
            if lower.startswith("type:") or lower.startswith("question_type:"):
                t_val = line.split(":", 1)[1].strip().upper().replace(" ", "_").replace("-", "_")
                raw_q["question_type"] = t_val
                continue
            if lower.startswith("difficulty:"):
                raw_q["difficulty"] = line.split(":", 1)[1].strip().upper()
                continue
            if lower.startswith("marks:"):
                try:
                    raw_q["marks"] = float(re.findall(r"[-+]?\d*\.\d+|\d+", line.split(":", 1)[1])[0])
                except (IndexError, ValueError):
                    pass
                continue
            if lower.startswith("negative_marks:") or lower.startswith("neg_marks:") or lower.startswith("negative:"):
                try:
                    raw_q["negative_marks"] = float(re.findall(r"[-+]?\d*\.\d+|\d+", line.split(":", 1)[1])[0])
                except (IndexError, ValueError):
                    pass
                continue
            if lower.startswith("explanation:"):
                raw_q["explanation"] = line.split(":", 1)[1].strip()
                continue
            if lower.startswith("expected_answer:") or lower.startswith("answer:") or lower.startswith("correct:"):
                ans_str = line.split(":", 1)[1].strip()
                raw_q["expected_answer"] = ans_str
                # Check for letters like A, B, C or 1, 2
                found_letters = re.findall(r"\b([A-Za-z0-9])\b", ans_str)
                for fl in found_letters:
                    correct_letters.add(fl.upper())
                continue

            # Option detection
            m_opt = opt_regex.match(line) or opt_num_regex.match(line)
            if m_opt and len(q_text_parts) > 0:
                letter = m_opt.group(1).upper()
                opt_body = m_opt.group(2).strip()
                is_corr = False
                if "[correct]" in opt_body.lower() or "(correct)" in opt_body.lower() or opt_body.endswith("*"):
                    is_corr = True
                    opt_body = re.sub(r"\[correct\]|\(correct\)|\*", "", opt_body, flags=re.IGNORECASE).strip()
                option_lines.append((letter, opt_body, is_corr))
                continue

            m_bullet = bullet_regex.match(line)
            if m_bullet and len(q_text_parts) > 0:
                opt_body = m_bullet.group(1).strip()
                is_corr = False
                if "[correct]" in opt_body.lower() or "(correct)" in opt_body.lower() or opt_body.endswith("*"):
                    is_corr = True
                    opt_body = re.sub(r"\[correct\]|\(correct\)|\*", "", opt_body, flags=re.IGNORECASE).strip()
                letter = chr(ord('A') + len(option_lines))
                option_lines.append((letter, opt_body, is_corr))
                continue

            # If not metadata or option, it's question text
            # Strip initial "1. " or "Q1. " from first line
            if not q_text_parts:
                cleaned_start = q_start_regex.sub("", line).strip()
                q_text_parts.append(cleaned_start if cleaned_start else line)
            else:
                q_text_parts.append(line)

        raw_q["question_text"] = " ".join(q_text_parts).strip()

        # Build options list
        options_list = []
        for idx, (label, text_val, is_marked_corr) in enumerate(option_lines):
            is_corr = is_marked_corr or (label in correct_letters)
            options_list.append({
                "option_text": text_val,
                "is_correct": is_corr,
                "option_order": idx
            })

        raw_q["options"] = options_list

        # Infer question type if not explicitly provided
        if options_list:
            correct_count = sum(1 for o in options_list if o["is_correct"])
            if correct_count > 1:
                raw_q["question_type"] = "MULTI_SELECT"
            else:
                raw_q["question_type"] = "MCQ"
        else:
            if raw_q["question_type"] in ["MCQ", "MULTI_SELECT"]:
                raw_q["question_type"] = "SHORT_ANSWER"

        if raw_q["question_text"]:
            questions.append(raw_q)

    return questions

def parse_csv_file(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse CSV with support for wide and narrow column structures."""
    try:
        decoded = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = file_bytes.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    questions: List[Dict[str, Any]] = []

    for row_idx, row in enumerate(reader, start=2):
        subject = (row.get("subject") or "").strip()
        q_text = (row.get("question_text") or row.get("question") or "").strip()
        q_type = (row.get("question_type") or row.get("type") or "MCQ").strip().upper()
        diff = (row.get("difficulty") or "MEDIUM").strip().upper()

        try:
            marks = float(row.get("marks", 1.0) or 1.0)
        except ValueError:
            marks = 1.0

        try:
            neg_marks = float(row.get("negative_marks", 0.0) or 0.0)
        except ValueError:
            neg_marks = 0.0

        options_data: List[Dict[str, Any]] = []

        # Check for option_a..d format
        letter_opts = ["a", "b", "c", "d", "e", "f"]
        has_letters = any(row.get(f"option_{l}") for l in letter_opts)

        if has_letters:
            corr_opts_raw = (row.get("correct_options") or row.get("correct_answer") or "").upper()
            corr_letters = [c.strip() for c in corr_opts_raw.replace(";", ",").split(",") if c.strip()]
            for idx, l in enumerate(letter_opts):
                val = (row.get(f"option_{l}") or "").strip()
                if val:
                    is_corr = l.upper() in corr_letters
                    options_data.append({"option_text": val, "is_correct": is_corr, "option_order": idx})
        else:
            # Check for option_1..9 format
            has_num_opts = any(row.get(f"option_{i}") for i in range(1, 10))
            if has_num_opts:
                for i in range(1, 10):
                    val = (row.get(f"option_{i}") or "").strip()
                    if val:
                        corr_val = (row.get(f"option_{i}_correct") or "").strip().lower()
                        is_corr = corr_val in ["true", "1", "yes", "y", "correct"]
                        options_data.append({"option_text": val, "is_correct": is_corr, "option_order": i - 1})
            else:
                # Check for single semicolon-delimited options column
                opts_col = (row.get("options") or "").strip()
                if opts_col:
                    parts = [p.strip() for p in opts_col.split(";") if p.strip()]
                    for idx, p in enumerate(parts):
                        is_corr = False
                        opt_str = p
                        if "[correct]" in p.lower() or "(correct)" in p.lower() or p.endswith("*"):
                            is_corr = True
                            opt_str = re.sub(r"\[correct\]|\(correct\)|\*", "", p, flags=re.IGNORECASE).strip()
                        options_data.append({"option_text": opt_str, "is_correct": is_corr, "option_order": idx})

        questions.append({
            "row_index": row_idx,
            "subject": subject,
            "topic": (row.get("topic") or "").strip() or None,
            "subtopic": (row.get("subtopic") or "").strip() or None,
            "question_text": q_text,
            "question_type": q_type,
            "difficulty": diff,
            "marks": marks,
            "negative_marks": neg_marks,
            "options": options_data,
            "expected_answer": (row.get("expected_answer") or "").strip() or None,
            "model_answer": (row.get("model_answer") or "").strip() or None,
            "explanation": (row.get("explanation") or "").strip() or None,
            "tags": (row.get("tags") or "").strip() or None
        })

    return questions

def parse_excel_file(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse Excel (.xlsx / .xls) worksheet with header detection."""
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []

    # Map headers to lower-case index
    header_row = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
    col_map: Dict[str, int] = {name: idx for idx, name in enumerate(header_row) if name}

    questions: List[Dict[str, Any]] = []

    def get_val(r: Tuple, key: str, default: Any = "") -> Any:
        idx = col_map.get(key)
        if idx is not None and idx < len(r) and r[idx] is not None:
            return str(r[idx]).strip()
        return default

    for row_idx, row in enumerate(rows[1:], start=2):
        if not any(row):
            continue

        subject = get_val(row, "subject")
        q_text = get_val(row, "question_text") or get_val(row, "question")
        q_type = (get_val(row, "question_type") or get_val(row, "type") or "MCQ").upper()
        diff = (get_val(row, "difficulty") or "MEDIUM").upper()

        try:
            marks = float(get_val(row, "marks", 1.0) or 1.0)
        except ValueError:
            marks = 1.0

        try:
            neg_marks = float(get_val(row, "negative_marks", 0.0) or 0.0)
        except ValueError:
            neg_marks = 0.0

        options_data: List[Dict[str, Any]] = []

        # Check option_1..option_9
        has_num_opts = any(get_val(row, f"option_{i}") for i in range(1, 10))
        if has_num_opts:
            for i in range(1, 10):
                val = get_val(row, f"option_{i}")
                if val:
                    corr_val = str(get_val(row, f"option_{i}_correct", "")).lower()
                    is_corr = corr_val in ["true", "1", "yes", "y", "correct"]
                    options_data.append({"option_text": val, "is_correct": is_corr, "option_order": i - 1})
        else:
            # Check option_a..option_d
            has_letter_opts = any(get_val(row, f"option_{l}") for l in ["a", "b", "c", "d", "e", "f"])
            if has_letter_opts:
                corr_opts = str(get_val(row, "correct_options") or get_val(row, "correct_answer")).upper()
                letters = [c.strip() for c in corr_opts.replace(";", ",").split(",") if c.strip()]
                for idx, l in enumerate(["a", "b", "c", "d", "e", "f"]):
                    val = get_val(row, f"option_{l}")
                    if val:
                        is_corr = l.upper() in letters
                        options_data.append({"option_text": val, "is_correct": is_corr, "option_order": idx})
            else:
                # Delimited options column
                opts_col = get_val(row, "options")
                if opts_col:
                    parts = [p.strip() for p in opts_col.split(";") if p.strip()]
                    for idx, p in enumerate(parts):
                        is_corr = False
                        opt_str = p
                        if "[correct]" in p.lower() or "(correct)" in p.lower() or p.endswith("*"):
                            is_corr = True
                            opt_str = re.sub(r"\[correct\]|\(correct\)|\*", "", p, flags=re.IGNORECASE).strip()
                        options_data.append({"option_text": opt_str, "is_correct": is_corr, "option_order": idx})

        questions.append({
            "row_index": row_idx,
            "subject": subject,
            "topic": get_val(row, "topic") or None,
            "subtopic": get_val(row, "subtopic") or None,
            "question_text": q_text,
            "question_type": q_type,
            "difficulty": diff,
            "marks": marks,
            "negative_marks": neg_marks,
            "options": options_data,
            "expected_answer": get_val(row, "expected_answer") or None,
            "model_answer": get_val(row, "model_answer") or None,
            "explanation": get_val(row, "explanation") or None,
            "tags": get_val(row, "tags") or None
        })

    return questions

def parse_json_file(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse JSON file containing list of question objects."""
    data = json.loads(file_bytes.decode("utf-8"))
    if not isinstance(data, list):
        if isinstance(data, dict) and "questions" in data and isinstance(data["questions"], list):
            data = data["questions"]
        else:
            data = [data]

    questions: List[Dict[str, Any]] = []
    for idx, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            continue

        raw_opts = item.get("options", [])
        parsed_opts = []
        if isinstance(raw_opts, list):
            for o_idx, opt in enumerate(raw_opts):
                if isinstance(opt, dict):
                    parsed_opts.append({
                        "option_text": str(opt.get("option_text", "")).strip(),
                        "is_correct": bool(opt.get("is_correct", False)),
                        "option_order": opt.get("option_order", o_idx)
                    })
                elif isinstance(opt, str):
                    # Check if string ends with [CORRECT] or if matching correct_answer
                    is_corr = False
                    txt = opt.strip()
                    if "[correct]" in txt.lower() or txt.endswith("*"):
                        is_corr = True
                        txt = re.sub(r"\[correct\]|\*", "", txt, flags=re.IGNORECASE).strip()
                    elif str(item.get("correct_answer", "")).strip().lower() == txt.lower():
                        is_corr = True
                    parsed_opts.append({
                        "option_text": txt,
                        "is_correct": is_corr,
                        "option_order": o_idx
                    })

        questions.append({
            "row_index": idx,
            "subject": str(item.get("subject", "")).strip(),
            "topic": item.get("topic"),
            "subtopic": item.get("subtopic"),
            "question_text": str(item.get("question_text", item.get("question", ""))).strip(),
            "question_type": str(item.get("question_type", item.get("type", "MCQ"))).strip().upper(),
            "difficulty": str(item.get("difficulty", "MEDIUM")).strip().upper(),
            "marks": float(item.get("marks", 1.0) or 1.0),
            "negative_marks": float(item.get("negative_marks", 0.0) or 0.0),
            "options": parsed_opts,
            "expected_answer": item.get("expected_answer"),
            "model_answer": item.get("model_answer"),
            "explanation": item.get("explanation"),
            "tags": item.get("tags")
        })

    return questions

def parse_docx_file(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse Word (.docx) document via table structure or paragraph block tokenizer."""
    doc = docx.Document(io.BytesIO(file_bytes))

    # 1. Check if document has structured tables
    if doc.tables:
        table_questions: List[Dict[str, Any]] = []
        for table in doc.tables:
            rows = table.rows
            if len(rows) < 2:
                continue
            header_cells = [c.text.strip().lower() for c in rows[0].cells]
            col_map = {name: idx for idx, name in enumerate(header_cells) if name}

            if "subject" in col_map or "question_text" in col_map or "question" in col_map:
                for row_idx, r in enumerate(rows[1:], start=2):
                    row_vals = [c.text.strip() for c in r.cells]
                    def get_t_val(k: str) -> str:
                        ci = col_map.get(k)
                        return row_vals[ci] if ci is not None and ci < len(row_vals) else ""

                    q_txt = get_t_val("question_text") or get_t_val("question")
                    if not q_txt:
                        continue

                    # Options parsing
                    opts_data = []
                    opts_col = get_t_val("options")
                    if opts_col:
                        for idx, p in enumerate(opts_col.split(";")):
                            if p.strip():
                                is_corr = "[correct]" in p.lower() or p.strip().endswith("*")
                                opt_str = re.sub(r"\[correct\]|\*", "", p, flags=re.IGNORECASE).strip()
                                opts_data.append({"option_text": opt_str, "is_correct": is_corr, "option_order": idx})

                    table_questions.append({
                        "row_index": len(table_questions) + 1,
                        "subject": get_t_val("subject") or "General",
                        "topic": get_t_val("topic") or None,
                        "subtopic": get_t_val("subtopic") or None,
                        "question_text": q_txt,
                        "question_type": (get_t_val("question_type") or get_t_val("type") or "MCQ").upper(),
                        "difficulty": (get_t_val("difficulty") or "MEDIUM").upper(),
                        "marks": float(get_t_val("marks") or 1.0),
                        "negative_marks": float(get_t_val("negative_marks") or 0.0),
                        "options": opts_data,
                        "expected_answer": get_t_val("expected_answer") or None,
                        "model_answer": get_t_val("model_answer") or None,
                        "explanation": get_t_val("explanation") or None,
                        "tags": get_t_val("tags") or None
                    })

        if table_questions:
            return table_questions

    # 2. Paragraph text extraction
    full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    return parse_unstructured_text(full_text)

def parse_pdf_file(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse PDF document by extracting page text and applying the question block tokenizer."""
    reader = PdfReader(io.BytesIO(file_bytes))
    full_text_list = []
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            full_text_list.append(txt)

    full_text = "\n".join(full_text_list)
    return parse_unstructured_text(full_text)

def parse_image_ocr(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Extract text from image using pytesseract and parse questions with graceful diagnostics."""
    warnings: List[str] = []
    try:
        image = Image.open(io.BytesIO(file_bytes))
        gray_image = image.convert("L")
        text = pytesseract.image_to_string(gray_image)
        extracted = text.strip()
        if not extracted:
            warnings.append("OCR did not identify any legible text in the uploaded image.")
            return [], warnings
        return parse_unstructured_text(extracted), warnings
    except pytesseract.TesseractNotFoundError:
        warnings.append("Tesseract OCR binary is not installed on the server. Image cannot be processed automatically.")
        return [], warnings
    except Exception as e:
        warnings.append(f"OCR processing error: {str(e)}")
        return [], warnings

def parse_file(file_bytes: bytes, filename: str, content_type: Optional[str] = None) -> Tuple[List[Dict[str, Any]], str, List[str]]:
    """Main format dispatcher detecting file type and calling corresponding parser."""
    lower_fn = filename.lower()
    warnings: List[str] = []

    if lower_fn.endswith(".csv") or (content_type and "csv" in content_type):
        return parse_csv_file(file_bytes), "CSV", warnings
    elif lower_fn.endswith(".xlsx") or lower_fn.endswith(".xls") or (content_type and "spreadsheet" in content_type):
        return parse_excel_file(file_bytes), "EXCEL", warnings
    elif lower_fn.endswith(".json") or (content_type and "json" in content_type):
        return parse_json_file(file_bytes), "JSON", warnings
    elif lower_fn.endswith(".docx") or (content_type and "wordprocessingml" in content_type):
        return parse_docx_file(file_bytes), "DOCX", warnings
    elif lower_fn.endswith(".pdf") or (content_type and "pdf" in content_type):
        return parse_pdf_file(file_bytes), "PDF", warnings
    elif any(lower_fn.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
        qs, ocr_warnings = parse_image_ocr(file_bytes)
        return qs, "IMAGE_OCR", ocr_warnings
    else:
        # Attempt fallback to text/CSV
        try:
            return parse_csv_file(file_bytes), "CSV", warnings
        except Exception:
            return [], "UNKNOWN", [f"Unsupported file format for '{filename}'."]

def validate_and_preview_questions(
    raw_questions: List[Dict[str, Any]],
    db: Session,
    user_id: int,
    initial_warnings: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Validates parsed questions row-by-row, detects duplicates against PostgreSQL and batch,
    and returns a structured preview response.
    """
    valid_types = {e.value for e in QuestionType}
    valid_diffs = {e.value for e in DifficultyLevel}

    # Fetch existing active questions for duplicate checking
    existing_records = db.query(QuestionBank.subject, QuestionBank.question_text).filter(
        QuestionBank.is_active == True
    ).all()
    existing_db_set = {
        (s.strip().lower(), q.strip().lower()) for s, q in existing_records
    }

    batch_seen_set: Set[Tuple[str, str]] = set()

    validated_items: List[Dict[str, Any]] = []
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0

    for idx, q in enumerate(raw_questions, start=1):
        row_idx = q.get("row_index", idx)
        subject = (q.get("subject") or "").strip()
        question_text = (q.get("question_text") or "").strip()
        q_type = (q.get("question_type") or "MCQ").strip().upper()
        diff = (q.get("difficulty") or "MEDIUM").strip().upper()
        marks = q.get("marks", 1.0)
        neg_marks = q.get("negative_marks", 0.0)
        options = q.get("options", [])

        errors: List[str] = []
        warnings: List[str] = []
        if initial_warnings and idx == 1:
            warnings.extend(initial_warnings)

        # 1. Subject validation
        if not subject:
            errors.append("Subject is required.")
        elif len(subject) > 100:
            errors.append("Subject cannot exceed 100 characters.")

        # 2. Question Text validation
        if not question_text:
            errors.append("Question text is required.")
        elif len(question_text) < 3:
            errors.append("Question text must be at least 3 characters.")

        # 3. Question Type validation
        if q_type not in valid_types:
            errors.append(f"Invalid question type '{q_type}'. Allowed: {', '.join(sorted(valid_types))}.")
            q_type = "MCQ"

        # 4. Difficulty validation
        if diff not in valid_diffs:
            errors.append(f"Invalid difficulty '{diff}'. Allowed: {', '.join(sorted(valid_diffs))}.")
            diff = "MEDIUM"

        # 5. Marks validation
        try:
            marks = float(marks)
            if marks <= 0:
                errors.append("Marks must be greater than 0.")
        except (ValueError, TypeError):
            errors.append("Marks must be a valid positive number.")
            marks = 1.0

        try:
            neg_marks = float(neg_marks)
            if neg_marks < 0:
                errors.append("Negative marks cannot be less than 0.")
        except (ValueError, TypeError):
            errors.append("Negative marks must be a valid number.")
            neg_marks = 0.0

        # 6. Options validation
        cleaned_options = []
        for o_idx, opt in enumerate(options):
            if isinstance(opt, dict):
                o_txt = str(opt.get("option_text", "")).strip()
                if o_txt:
                    cleaned_options.append({
                        "option_text": o_txt,
                        "is_correct": bool(opt.get("is_correct", False)),
                        "option_order": opt.get("option_order", o_idx)
                    })

        if q_type in ["MCQ", "MULTI_SELECT"]:
            if len(cleaned_options) < 2:
                errors.append(f"{q_type} questions require at least 2 non-empty options (found {len(cleaned_options)}).")
            else:
                correct_count = sum(1 for o in cleaned_options if o["is_correct"])
                if q_type == "MCQ" and correct_count != 1:
                    errors.append(f"MCQ must have exactly 1 correct option (found {correct_count}).")
                elif q_type == "MULTI_SELECT" and correct_count < 2:
                    errors.append(f"Multi-Select must have at least 2 correct options (found {correct_count}).")

        # 7. Duplicate checking
        is_duplicate = False
        key = (subject.lower(), question_text.lower())
        if subject and question_text:
            if key in existing_db_set:
                is_duplicate = True
                warnings.append("Question already exists in the database with identical subject and text.")
            elif key in batch_seen_set:
                is_duplicate = True
                warnings.append("Duplicate question found earlier in this same import file.")
            else:
                batch_seen_set.add(key)

        # 8. Determine item status
        if errors:
            status = "INVALID"
            invalid_count += 1
        elif is_duplicate:
            status = "DUPLICATE"
            duplicate_count += 1
        else:
            status = "VALID"
            valid_count += 1

        validated_items.append({
            "row_index": row_idx,
            "subject": subject,
            "topic": q.get("topic"),
            "subtopic": q.get("subtopic"),
            "question_text": question_text,
            "question_type": q_type,
            "difficulty": diff,
            "marks": marks,
            "negative_marks": neg_marks,
            "options": cleaned_options,
            "expected_answer": q.get("expected_answer"),
            "model_answer": q.get("model_answer"),
            "explanation": q.get("explanation"),
            "tags": q.get("tags"),
            "status": status,
            "errors": errors,
            "warnings": warnings
        })

    return {
        "total_detected": len(validated_items),
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "duplicate_count": duplicate_count,
        "questions": validated_items
    }

def commit_import_questions(
    questions: List[Dict[str, Any]],
    db: Session,
    user_id: int,
    skip_invalid: bool = True,
    allow_duplicates: bool = False
) -> Dict[str, Any]:
    """
    Inserts confirmed questions and options into PostgreSQL tables.
    Runs inside a single atomic database transaction.
    """
    imported_count = 0
    skipped_invalid_count = 0
    skipped_duplicate_count = 0

    for q in questions:
        status = q.get("status", "VALID")

        if status == "INVALID":
            skipped_invalid_count += 1
            continue

        if status == "DUPLICATE" and not allow_duplicates:
            skipped_duplicate_count += 1
            continue

        # Convert strings to Enum
        try:
            q_type_enum = QuestionType(q["question_type"])
            diff_enum = DifficultyLevel(q["difficulty"])
        except ValueError:
            skipped_invalid_count += 1
            continue

        # Create QuestionBank record
        db_q = QuestionBank(
            subject=q["subject"].strip(),
            topic=(q.get("topic") or "").strip() or None,
            subtopic=(q.get("subtopic") or "").strip() or None,
            question_text=q["question_text"].strip(),
            question_type=q_type_enum,
            difficulty=diff_enum,
            marks=float(q.get("marks", 1.0)),
            negative_marks=float(q.get("negative_marks", 0.0)),
            expected_answer=(q.get("expected_answer") or "").strip() or None,
            model_answer=(q.get("model_answer") or "").strip() or None,
            explanation=(q.get("explanation") or "").strip() or None,
            tags=(q.get("tags") or "").strip() or None,
            is_active=True,
            created_by=user_id
        )
        db.add(db_q)
        db.flush()  # Generates db_q.id

        # Insert Options if applicable
        for opt in q.get("options", []):
            opt_obj = Option(
                question_id=db_q.id,
                option_text=opt["option_text"].strip(),
                is_correct=bool(opt.get("is_correct", False)),
                option_order=int(opt.get("option_order", 0))
            )
            db.add(opt_obj)

        imported_count += 1

    db.commit()

    return {
        "imported_count": imported_count,
        "skipped_invalid_count": skipped_invalid_count,
        "skipped_duplicate_count": skipped_duplicate_count,
        "message": f"Successfully imported {imported_count} questions into the question bank."
    }
