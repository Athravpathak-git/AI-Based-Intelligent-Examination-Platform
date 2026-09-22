import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_questions_csv_template_download(client, examiner_auth_headers):
    res = client.get(
        "/api/questions/template/csv",
        headers=examiner_auth_headers
    )
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "question_text" in res.text
    assert "option_1" in res.text

def test_questions_csv_export(client, examiner_auth_headers):
    # Seed a question to export
    client.post(
        "/api/questions",
        json={"subject": "Mathematics", "question_text": "Sample export question", "question_type": "SHORT_ANSWER", "difficulty": "EASY", "marks": 2.0},
        headers=examiner_auth_headers
    )
    res = client.get(
        "/api/questions/export/csv",
        headers=examiner_auth_headers
    )
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "subject" in res.text

def test_questions_pdf_export(client, examiner_auth_headers):
    # Seed a question to export
    client.post(
        "/api/questions",
        json={"subject": "Mathematics", "question_text": "Sample export question", "question_type": "SHORT_ANSWER", "difficulty": "EASY", "marks": 2.0},
        headers=examiner_auth_headers
    )
    res = client.get(
        "/api/questions/export/pdf",
        headers=examiner_auth_headers
    )
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    # Verify PDF magic bytes
    assert res.content.startswith(b"%PDF-")

def test_questions_csv_import_valid_and_invalid(client, examiner_auth_headers):
    csv_data = """subject,question_text,question_type,difficulty,marks,negative_marks,option_1,option_1_correct,option_2,option_2_correct,option_3,option_3_correct,option_4,option_4_correct,expected_answer,model_answer
Mathematics,What is 5 + 7?,MCQ,EASY,2.0,0.5,12,TRUE,10,FALSE,14,FALSE,15,FALSE,,
Mathematics,Which are prime numbers?,MULTI_SELECT,MEDIUM,3.0,1.0,2,TRUE,3,TRUE,4,FALSE,6,FALSE,,
Mathematics,MCQ With No Correct Option,MCQ,EASY,2.0,0.5,A,FALSE,B,FALSE,,,FALSE,,,
,Missing Subject Question,MCQ,EASY,2.0,0.5,A,TRUE,B,FALSE,,,FALSE,,,
"""
    file_bytes = io.BytesIO(csv_data.encode("utf-8"))
    files = {"file": ("test_import.csv", file_bytes, "text/csv")}

    res = client.post(
        "/api/questions/import/csv",
        files=files,
        headers=examiner_auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    # 2 valid questions imported
    assert data["imported_count"] == 2
    # 2 invalid rows recorded with row-level error messages
    assert data["error_count"] == 2
    assert any("exactly 1 correct option" in err for err in data["errors"])
    assert any("'subject' and 'question_text' are required" in err for err in data["errors"])
