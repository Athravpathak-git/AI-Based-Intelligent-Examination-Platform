import io
import os
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

# ============================================================================
# MULTILINGUAL SUPPORT & SYSTEM FONTS (ALL 7 INDIC SCRIPTS)
# ============================================================================
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

win_regular = "C:/Windows/Fonts/Nirmala.ttf"
win_bold = "C:/Windows/Fonts/NirmalaB.ttf"
if os.path.exists(win_regular) and os.path.exists(win_bold):
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        pdfmetrics.registerFont(TTFont("Nirmala", win_regular))
        pdfmetrics.registerFont(TTFont("Nirmala-Bold", win_bold))
        FONT_REGULAR = "Nirmala"
        FONT_BOLD = "Nirmala-Bold"
    except Exception:
        FONT_REGULAR = "Helvetica"
        FONT_BOLD = "Helvetica-Bold"

PDF_I18N = {
    "en": {
        "brand_title": "INTELLIEXAMAI • AI-BASED INTELLIGENT EXAMINATION PLATFORM",
        "doc_title": "OFFICIAL CANDIDATE EXAMINATION RESULT & TRANSCRIPT",
        "doc_subtitle": "Institutional Academic Assessment Record • Authoritative Performance Report",
        "sec_1_title": "1. Candidate & Assessment Information",
        "lbl_candidate_name": "Candidate Name:",
        "lbl_exam_title": "Examination Title:",
        "lbl_roll_no": "Registration / Roll No:",
        "lbl_subject": "Curriculum / Subject:",
        "lbl_email": "Candidate Email:",
        "lbl_exam_id": "Examination ID:",
        "lbl_exam_date": "Examination Date:",
        "lbl_attempt": "Attempt Number:",
        "lbl_started_at": "Session Started At:",
        "lbl_submitted_at": "Session Submitted At:",
        "sec_2_title": "2. Performance & Evaluation Summary",
        "col_max_marks": "Maximum Marks",
        "col_obtained_marks": "Obtained Marks",
        "col_percentage": "Percentage",
        "col_outcome": "Outcome",
        "col_negative_ded": "Negative Deduction",
        "col_eval_status": "Evaluation Status",
        "status_passed": "PASSED",
        "status_failed": "FAILED",
        "sec_3_title": "3. Itemized Question Evaluation",
        "col_hash": "#",
        "col_q_type": "Question Type",
        "col_q_statement": "Question Statement Summary",
        "col_q_max": "Max Marks",
        "col_q_awarded": "Marks Awarded",
        "col_q_status": "Evaluation Status",
        "status_auto_evaluated": "Auto Evaluated",
        "status_faculty_graded": "Faculty Graded",
        "status_evaluated": "Evaluated",
        "sec_4_title": "4. Evaluator Remarks & Official Declaration",
        "lbl_evaluator_remarks": "Official Evaluator Remarks:",
        "lbl_evaluated_by": "Evaluated / Finalized By:",
        "lbl_finalized_on": "Evaluation Finalized On:",
        "lbl_published_on": "Result Officially Published On:",
        "no_remarks": "No additional remarks provided.",
        "attestation_title": "Institutional Declaration:",
        "attestation_body": "This transcript is generated directly from the IntelliExamAI secure examination repository. All candidate responses were logged under verified proctoring conditions and evaluated in compliance with academic grading standards. Marks recorded herein are authoritative and final.",
        "footer_downloaded_on": "PDF Downloaded On:",
        "footer_downloaded_by": "Downloaded By: Candidate / Institution",
        "page_str": "Page"
    },
    "mr": {
        "brand_title": "INTELLIEXAMAI • कृत्रिम बुद्धिमत्ता आधारित प्रगत परीक्षा प्रणाली",
        "doc_title": "अधिकृत उमेदवार परीक्षा निकाल व गुणपत्रिका",
        "doc_subtitle": "संस्थात्मक शैक्षणिक मूल्यांकन अभिलेख • अधिकृत कामगिरी अहवाल",
        "sec_1_title": "१. उमेदवार व परीक्षा तपशील",
        "lbl_candidate_name": "उमेदवाराचे नाव:",
        "lbl_exam_title": "परीक्षेचे नाव:",
        "lbl_roll_no": "नोंदणी / रोल नंबर:",
        "lbl_subject": "अभ्यासक्रम / विषय:",
        "lbl_email": "उमेदवाराचा ईमेल:",
        "lbl_exam_id": "परीक्षा आयडी:",
        "lbl_exam_date": "परीक्षेची तारीख:",
        "lbl_attempt": "प्रयत्न क्रमांक:",
        "lbl_started_at": "सत्र सुरू झाले:",
        "lbl_submitted_at": "सत्र सादर केले:",
        "sec_2_title": "२. कामगिरी व मूल्यांकन सारांश",
        "col_max_marks": "कमाल गुण",
        "col_obtained_marks": "मिळालेले गुण",
        "col_percentage": "टक्केवारी",
        "col_outcome": "निकाल निष्कर्ष",
        "col_negative_ded": "नकारात्मक कपात",
        "col_eval_status": "मूल्यांकन स्थिती",
        "status_passed": "उत्तीर्ण (PASSED)",
        "status_failed": "अनुत्तीर्ण (FAILED)",
        "sec_3_title": "३. प्रश्ननिहाय मूल्यांकन तपशील",
        "col_hash": "क्र.",
        "col_q_type": "प्रश्नाचा प्रकार",
        "col_q_statement": "प्रश्न सारांश",
        "col_q_max": "कमाल गुण",
        "col_q_awarded": "प्राप्त गुण",
        "col_q_status": "मूल्यांकन स्थिती",
        "status_auto_evaluated": "स्वयं मूल्यमापित",
        "status_faculty_graded": "शिक्षकांकडून तपासलेले",
        "status_evaluated": "मूल्यांकन पूर्ण",
        "sec_4_title": "४. परीक्षक अभिप्राय व अधिकृत घोषणा",
        "lbl_evaluator_remarks": "अधिकृत परीक्षक अभिप्राय:",
        "lbl_evaluated_by": "मूल्यांकन / अंतिम रूप देणारे:",
        "lbl_finalized_on": "मूल्यांकन अंतिम केले:",
        "lbl_published_on": "निकाल अधिकृत प्रसिद्ध केला:",
        "no_remarks": "कोणतीही अतिरिक्त टिप्पणी नोंदवलेली नाही.",
        "attestation_title": "संस्थात्मक हमीपत्र व घोषणा:",
        "attestation_body": "ही गुणपत्रिका थेट IntelliExamAI सुरक्षित परीक्षा डेटाबेसमधून तयार करण्यात आली आहे. सर्व उमेदवार उत्तरे पडताळणी केलेल्या देखरेखीखाली नोंदवली गेली असून शैक्षणिक मानांकनानुसार तपासली गेली आहेत. यातील गुण अधिकृत आणि अंतिम आहेत.",
        "footer_downloaded_on": "पीडीएफ डाउनलोड वेळ:",
        "footer_downloaded_by": "डाउनलोडकर्ता: उमेदवार / संस्था",
        "page_str": "पृष्ठ"
    },
    "hi": {
        "brand_title": "INTELLIEXAMAI • एआई-आधारित उन्नत परीक्षा एवं मूल्यांकन मंच",
        "doc_title": "आधिकारिक अभ्यर्थी परीक्षा परिणाम एवं अंकतालिका",
        "doc_subtitle": "संस्थागत शैक्षणिक मूल्यांकन अभिलेख • आधिकारिक प्रदर्शन विवरण",
        "sec_1_title": "१. अभ्यर्थी एवं परीक्षा विवरण",
        "lbl_candidate_name": "अभ्यर्थी का नाम:",
        "lbl_exam_title": "परीक्षा का नाम:",
        "lbl_roll_no": "पंजीकरण / अनुक्रमांक:",
        "lbl_subject": "पाठ्यक्रम / विषय:",
        "lbl_email": "अभ्यर्थी ईमेल:",
        "lbl_exam_id": "परीक्षा आईडी:",
        "lbl_exam_date": "परीक्षा तिथि:",
        "lbl_attempt": "प्रयास संख्या:",
        "lbl_started_at": "सत्र प्रारंभ समय:",
        "lbl_submitted_at": "सत्र जमा समय:",
        "sec_2_title": "२. प्रदर्शन एवं मूल्यांकन सारांश",
        "col_max_marks": "पूर्णांक",
        "col_obtained_marks": "प्राप्तांक",
        "col_percentage": "प्रतिशत",
        "col_outcome": "परिणाम",
        "col_negative_ded": "नकारात्मक अंकन",
        "col_eval_status": "मूल्यांकन स्थिति",
        "status_passed": "उत्तीर्ण (PASSED)",
        "status_failed": "अनुत्तीर्ण (FAILED)",
        "sec_3_title": "३. प्रश्नवार विस्तृत मूल्यांकन",
        "col_hash": "क्र.",
        "col_q_type": "प्रश्न प्रकार",
        "col_q_statement": "प्रश्न सारांश",
        "col_q_max": "पूर्णांक",
        "col_q_awarded": "प्राप्तांक",
        "col_q_status": "मूल्यांकन स्थिति",
        "status_auto_evaluated": "स्वतः मूल्यांकित",
        "status_faculty_graded": "परीक्षक द्वारा मूल्यांकित",
        "status_evaluated": "मूल्यांकन पूर्ण",
        "sec_4_title": "४. परीक्षक टिप्पणी एवं आधिकारिक घोषणा",
        "lbl_evaluator_remarks": "आधिकारिक परीक्षक टिप्पणी:",
        "lbl_evaluated_by": "मूल्यांकनकर्ता / परीक्षक:",
        "lbl_finalized_on": "मूल्यांकन समापन तिथि:",
        "lbl_published_on": "परिणाम प्रकाशन तिथि:",
        "no_remarks": "कोई अतिरिक्त टिप्पणी नहीं दी गई।",
        "attestation_title": "संस्थागत घोषणा:",
        "attestation_body": "यह प्रतिलेख सीधे IntelliExamAI सुरक्षित परीक्षा प्रणाली से तैयार किया गया है। सभी उत्तर सत्यापित निगरानी के तहत दर्ज किए गए हैं और शैक्षणिक मानकों के अनुरूप मूल्यांकित हैं। यहाँ दर्ज अंक आधिकारिक और अंतिम हैं।",
        "footer_downloaded_on": "पीडीएफ डाउनलोड समय:",
        "footer_downloaded_by": "डाउनलोडकर्ता: अभ्यर्थी / संस्था",
        "page_str": "पृष्ठ"
    },
    "te": {
        "brand_title": "INTELLIEXAMAI • AI-ఆధారిత పరీక్ష మరియు మూల్యాంకన వేదిక",
        "doc_title": "అధికారిక అభ్యర్థి పరీక్ష ఫలితం & ట్రాన్స్క్రిప్ట్",
        "doc_subtitle": "సంస్థాగత విద్యా మూల్యాంకన రికార్డు • అధికారిక ప్రదర్శన నివేదిక",
        "sec_1_title": "1. అభ్యర్థి మరియు పరీక్ష సమాచారం",
        "lbl_candidate_name": "అభ్యర్థి పేరు:",
        "lbl_exam_title": "పరీక్ష పేరు:",
        "lbl_roll_no": "నమోదు / రోల్ నెం:",
        "lbl_subject": "విషయం:",
        "lbl_email": "ఈమెయిల్:",
        "lbl_exam_id": "పరీక్ష ఐడి:",
        "lbl_exam_date": "పరీక్ష తేదీ:",
        "lbl_attempt": "ప్రయత్నం సంఖ్య:",
        "lbl_started_at": "ప్రారంభ సమయం:",
        "lbl_submitted_at": "సమర్పించిన సమయం:",
        "sec_2_title": "2. పనితీరు మరియు మూల్యాంకన సారాంశం",
        "col_max_marks": "గరిష్ట మార్కులు",
        "col_obtained_marks": "పొందిన మార్కులు",
        "col_percentage": "శాతం",
        "col_outcome": "ఫలితం",
        "col_negative_ded": "నెగటివ్ మార్కులు",
        "col_eval_status": "మూల్యాంకన స్థితి",
        "status_passed": "ఉత్తీర్ణత (PASSED)",
        "status_failed": "అనుత్తీర్ణత (FAILED)",
        "sec_3_title": "3. ప్రశ్నావళి మూల్యాంకన వివరాలు",
        "col_hash": "#",
        "col_q_type": "ప్రశ్న రకం",
        "col_q_statement": "ప్రశ్న సారాంశం",
        "col_q_max": "గరిష్ట మార్కులు",
        "col_q_awarded": "లభించిన మార్కులు",
        "col_q_status": "స్థితి",
        "status_auto_evaluated": "ఆటో మూల్యాంకనం",
        "status_faculty_graded": "ఫ్యాకల్టీ మూల్యాంకనం",
        "status_evaluated": "మూల్యాంకనం పూర్తయింది",
        "sec_4_title": "4. ఎగ్జామినర్ వ్యాఖ్యలు & అధికారిక ప్రకటన",
        "lbl_evaluator_remarks": "ఎగ్జామినర్ వ్యాఖ్యలు:",
        "lbl_evaluated_by": "మూల్యాంకనం చేసినవారు:",
        "lbl_finalized_on": "ఖరారు చేసిన తేదీ:",
        "lbl_published_on": "ఫలితం విడుదలైన తేదీ:",
        "no_remarks": "అదనపు వ్యాఖ్యలు లేవు.",
        "attestation_title": "సంస్థాగత ప్రకటన:",
        "attestation_body": "ఈ ట్రాన్స్క్రిప్ట్ నేరుగా IntelliExamAI సురಕ್ಷిత పరీక్ష నిల్వ నుండి రూపొందించబడింది. మార్కులు అధికారికమైనవి మరియు తుది నిర్ణయం.",
        "footer_downloaded_on": "డౌన్లోడ్ సమయం:",
        "footer_downloaded_by": "డౌన్లోడ్ చేసినవారు: అభ్యర్థి",
        "page_str": "పేజీ"
    },
    "ta": {
        "brand_title": "INTELLIEXAMAI • AI-அடிப்படையிலான அறிவார்ந்த தேர்வு தளம்",
        "doc_title": "அதிகாரப்பூர்வ தேர்வு முடிவு மற்றும் மதிப்பெண் சான்றிதழ்",
        "doc_subtitle": "நிறுவன கல்வி மதிப்பீட்டுப் பதிவு • செயல்திறன் அறிக்கை",
        "sec_1_title": "1. தேர்வர் மற்றும் தேர்வு தகவல்",
        "lbl_candidate_name": "தேர்வர் பெயர்:",
        "lbl_exam_title": "தேர்வு பெயர்:",
        "lbl_roll_no": "பதிவு எண்:",
        "lbl_subject": "பாடம்:",
        "lbl_email": "மின்னஞ்சல்:",
        "lbl_exam_id": "தேர்வு ஐடி:",
        "lbl_exam_date": "தேர்வு தேதி:",
        "lbl_attempt": "முயற்சி எண்:",
        "lbl_started_at": "தொடக்க நேரம்:",
        "lbl_submitted_at": "சமர்ப்பித்த நேரம்:",
        "sec_2_title": "2. செயல்திறன் மற்றும் மதிப்பீட்டு சுருக்கம்",
        "col_max_marks": "அதிகபட்ச மதிப்பெண்கள்",
        "col_obtained_marks": "பெற்ற மதிப்பெண்கள்",
        "col_percentage": "சதவீதம்",
        "col_outcome": "முடிவு",
        "col_negative_ded": "எதிர்மறை மதிப்பெண்",
        "col_eval_status": "மதிப்பீட்டு நிலை",
        "status_passed": "தேர்ச்சி (PASSED)",
        "status_failed": "தோல்வி (FAILED)",
        "sec_3_title": "3. வினா வாரியான மதிப்பீடு",
        "col_hash": "#",
        "col_q_type": "வினா வகை",
        "col_q_statement": "வினா விவரம்",
        "col_q_max": "அதிகபட்சம்",
        "col_q_awarded": "வழங்கப்பட்டது",
        "col_q_status": "மதிப்பீட்டு நிலை",
        "status_auto_evaluated": "தானியங்கி மதிப்பீடு",
        "status_faculty_graded": "ஆசிரியர் மதிப்பீடு",
        "status_evaluated": "மதிப்பீடு முடிந்தது",
        "sec_4_title": "4. மதிப்பீட்டாளர் கருத்துகள் & அதிகாரப்பூர்வ அறிவிப்பு",
        "lbl_evaluator_remarks": "மதிப்பீட்டாளர் கருத்துகள்:",
        "lbl_evaluated_by": "மதிப்பீடு செய்தவர்:",
        "lbl_finalized_on": "இறுதி செய்யப்பட்ட தேதி:",
        "lbl_published_on": "வெளியிடப்பட்ட தேதி:",
        "no_remarks": "கூடுதல் கருத்துகள் இல்லை.",
        "attestation_title": "நிறுவன அறிவிப்பு:",
        "attestation_body": "இந்த மதிப்பெண் அறிக்கை IntelliExamAI தேர்வு களஞ்சியத்திலிருந்து பாதுகாப்பாக உருவாக்கப்பட்டது. இதில் உள்ள மதிப்பெண்கள் இறுதியானவை.",
        "footer_downloaded_on": "பதிவிறக்கம் செய்யப்பட்ட நேரம்:",
        "footer_downloaded_by": "பதிவிறக்கியவர்: தேர்வர்",
        "page_str": "பக்கம்"
    },
    "ml": {
        "brand_title": "INTELLIEXAMAI • AI-അധിഷ്ഠിത ബുദ്ധിപരമായ പരീക്ഷാ പ്ലാറ്റ്ഫോം",
        "doc_title": "ഔദ്യോഗിക പരീക്ഷാ ഫലവും മാർക്ക് ലിസ്റ്റും",
        "doc_subtitle": "സ്ഥാപന അക്കാദമിക് മൂല്യനിർണ്ണയ രേഖ • പ്രകടന റിപ്പോർട്ട്",
        "sec_1_title": "1. ഉദ്യോഗാർത്ഥിയുടെയും പരീക്ഷയുടെയും വിവരങ്ങൾ",
        "lbl_candidate_name": "ഉദ്യോഗാർത്ഥിയുടെ പേര്:",
        "lbl_exam_title": "പരീക്ഷയുടെ പേര്:",
        "lbl_roll_no": "രജിസ്ട്രേഷൻ / റോൾ നമ്പർ:",
        "lbl_subject": "വിഷയം:",
        "lbl_email": "ഇമെയിൽ:",
        "lbl_exam_id": "പരീക്ഷ ഐഡി:",
        "lbl_exam_date": "പരീക്ഷാ തീയതി:",
        "lbl_attempt": "ശ്രമം:",
        "lbl_started_at": "ആരംഭിച്ച സമയം:",
        "lbl_submitted_at": "സമർപ്പിച്ച സമയം:",
        "sec_2_title": "2. പ്രകടനവും മൂല്യനിർണ്ണയ സംഗ്രഹവും",
        "col_max_marks": "പരമാവധി മാർക്ക്",
        "col_obtained_marks": "ലഭിച്ച മാർക്ക്",
        "col_percentage": "ശതമാനം",
        "col_outcome": "ഫലം",
        "col_negative_ded": "നെഗറ്റീവ് മാർക്ക്",
        "col_eval_status": "മൂല്യനിർണ്ണയ നില",
        "status_passed": "വിജയിച്ചു (PASSED)",
        "status_failed": "പരാജയപ്പെട്ടു (FAILED)",
        "sec_3_title": "3. ചോദ്യം തിരിച്ചുള്ള മൂല്യനിർണ്ണയം",
        "col_hash": "#",
        "col_q_type": "ചോദ്യ തരം",
        "col_q_statement": "ചോദ്യ സംഗ്രഹം",
        "col_q_max": "പരമാവധി",
        "col_q_awarded": "ലഭിച്ച മാർക്ക്",
        "col_q_status": "നില",
        "status_auto_evaluated": "സ്വയമേവ വിലയിരുത്തിയത്",
        "status_faculty_graded": "അധ്യാപകൻ വിലയിരുത്തിയത്",
        "status_evaluated": "മൂല്യനിർണ്ണയം പൂർത്തിയായി",
        "sec_4_title": "4. മൂല്യനിർണ്ണയകന്റെ അഭിപ്രായങ്ങൾ & പ്രഖ്യാപനം",
        "lbl_evaluator_remarks": "മൂല്യനിർണ്ണയകന്റെ അഭിപ്രായം:",
        "lbl_evaluated_by": "മൂല്യനിർണ്ണയം നടത്തിയത്:",
        "lbl_finalized_on": "പൂർത്തിയാക്കിയ തീയതി:",
        "lbl_published_on": "ഫലം പ്രസിദ്ധീകരിച്ച തീയതി:",
        "no_remarks": "കൂടുതൽ അഭിപ്രായങ്ങൾ രേഖപ്പെടുത്തിയിട്ടില്ല.",
        "attestation_title": "സ്ഥാപന പ്രഖ്യാപനം:",
        "attestation_body": "ഈ സർട്ടിഫിക്കറ്റ് IntelliExamAI സുരക്ഷിത പരീക്ഷാ ശേഖരത്തിൽ നിന്ന് നേരിട്ട് സൃഷ്ടിച്ചതാണ്. ഇതിൽ രേഖപ്പെടുത്തിയിട്ടുള്ള മാർക്കുകൾ ആധികാരികവും അന്തിമവുമാണ്.",
        "footer_downloaded_on": "ഡൗൺലോഡ് ചെയ്ത സമയം:",
        "footer_downloaded_by": "ഡൗൺലോഡ് ചെയ്തത്: ഉദ്യോഗാർത്ഥി",
        "page_str": "പേജ്"
    },
    "kn": {
        "brand_title": "INTELLIEXAMAI • AI-ಆಧಾರಿತ ಸುಧಾರಿತ ಪರೀಕ್ಷಾ ವೇದಿಕೆ",
        "doc_title": "ಅಧಿಕೃತ ಅಭ್ಯರ್ಥಿ ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶ ಮತ್ತು ಅಂಕಪಟ್ಟಿ",
        "doc_subtitle": "ಸಾಂಸ್ಥಿಕ ಶೈಕ್ಷಣಿಕ ಮೌಲ್ಯಮಾಪನ ದಾಖಲೆ • ಅಧಿಕೃತ ಕಾರ್ಯಕ್ಷಮತೆ ವರದಿ",
        "sec_1_title": "1. ಅಭ್ಯರ್ಥಿ ಮತ್ತು ಪರೀಕ್ಷಾ ವಿವರಗಳು",
        "lbl_candidate_name": "ಅಭ್ಯರ್ಥಿಯ ಹೆಸರು:",
        "lbl_exam_title": "ಪರೀಕ್ಷೆಯ ಹೆಸರು:",
        "lbl_roll_no": "ನೋಂದಣಿ / ರೋಲ್ ಸಂಖ್ಯೆ:",
        "lbl_subject": "ವಿಷಯ:",
        "lbl_email": "ಇಮೇಲ್:",
        "lbl_exam_id": "ಪರೀಕ್ಷಾ ಐಡಿ:",
        "lbl_exam_date": "ಪರೀಕ್ಷಾ ದಿನಾಂಕ:",
        "lbl_attempt": "ಪ್ರಯತ್ನ ಸಂಖ್ಯೆ:",
        "lbl_started_at": "ಪ್ರಾರಂಭಿಸಿದ ಸಮಯ:",
        "lbl_submitted_at": "ಸಲ್ಲಿಸಿದ ಸಮಯ:",
        "sec_2_title": "2. ಕಾರ್ಯಕ್ಷಮತೆ ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ಸಾರಾಂಶ",
        "col_max_marks": "ಗರಿಷ್ಠ ಅಂಕಗಳು",
        "col_obtained_marks": "ಪಡೆದ ಅಂಕಗಳು",
        "col_percentage": "ಶೇಕಡಾವಾರು",
        "col_outcome": "ಫಲಿತಾಂಶ",
        "col_negative_ded": "ಋಣಾತ್ಮಕ ಅಂಕಗಳು",
        "col_eval_status": "ಮೌಲ್ಯಮಾಪನ ಸ್ಥಿತಿ",
        "status_passed": "ತೇರ್ಗಡೆ (PASSED)",
        "status_failed": "ಅನುತ್ತೀರ್ಣ (FAILED)",
        "sec_3_title": "3. ಪ್ರಶ್ನಾವಾರು ಮೌಲ್ಯಮಾಪನ ವಿವರಗಳು",
        "col_hash": "#",
        "col_q_type": "ಪ್ರಶ್ನೆ ಪ್ರಕಾರ",
        "col_q_statement": "ಪ್ರಶ್ನೆ ಸಾರಾಂಶ",
        "col_q_max": "ಗರಿಷ್ಠ ಅಂಕ",
        "col_q_awarded": "ಗಳಿಸಿದ ಅಂಕ",
        "col_q_status": "ಸ್ಥಿತಿ",
        "status_auto_evaluated": "ಸ್ವಯಂ ಮೌಲ್ಯಮಾಪನ",
        "status_faculty_graded": "ಶಿಕ್ಷಕರ ಮೌಲ್ಯಮಾಪನ",
        "status_evaluated": "ಮೌಲ್ಯಮಾಪನ ಪೂರ್ಣಗೊಂಡಿದೆ",
        "sec_4_title": "4. ಮೌಲ್ಯಮಾಪಕರ ಟಿಪ್ಪಣಿಗಳು & ಅಧಿಕೃತ ಘೋಷಣೆ",
        "lbl_evaluator_remarks": "ಅಧಿಕೃತ ಮೌಲ್ಯಮಾಪಕರ ಟಿಪ್ಪಣಿ:",
        "lbl_evaluated_by": "ಮೌಲ್ಯಮಾಪನ ಮಾಡಿದವರು:",
        "lbl_finalized_on": "ಅಂತಿಮಗೊಳಿಸಿದ ದಿನಾಂಕ:",
        "lbl_published_on": "ಫಲಿತಾಂಶ ಪ್ರಕಟಿಸಿದ ದಿನಾಂಕ:",
        "no_remarks": "ಯಾವುದೇ ಹೆಚ್ಚಿನ ಟಿಪ್ಪಣಿಗಳನ್ನು ನಮೂದಿಸಿಲ್ಲ.",
        "attestation_title": "ಸಾಂಸ್ಥಿಕ ಘೋಷಣೆ:",
        "attestation_body": "ಈ ಅಂಕಪಟ್ಟಿಯನ್ನು IntelliExamAI ಸುರಕ್ಷಿತ ಪರೀಕ್ಷಾ ಭಂಡಾರದಿಂದ ನೇರವಾಗಿ ರಚಿಸಲಾಗಿದೆ. ಇಲ್ಲಿ ದಾಖಲಾದ ಅಂಕಗಳು ಅಧಿಕೃತ ಮತ್ತು ಅಂತಿಮವಾಗಿರುತ್ತವೆ.",
        "footer_downloaded_on": "ಡೌನ್‌ಲೋಡ್ ದಿನಾಂಕ & ಸಮಯ:",
        "footer_downloaded_by": "ಡೌನ್‌ಲೋಡ್ ಮಾಡಿದವರು: ಅಭ್ಯರ್ಥಿ",
        "page_str": "ಪುಟ"
    }
}

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        self._download_ts = kwargs.pop("download_ts", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
        self._font_regular = kwargs.pop("font_regular", FONT_REGULAR)
        self._footer_left = kwargs.pop("footer_left", "PDF Downloaded On:")
        self._page_word = kwargs.pop("page_word", "Page")
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

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
        self.setFont(self._font_regular, 7.5)
        self.setFillColor(colors.HexColor("#6B6B76"))
        self.setStrokeColor(colors.HexColor("#EAE6DF"))
        self.setLineWidth(0.5)
        self.line(36, 32, letter[0] - 36, 32)
        txt_left = f"{self._footer_left} {getattr(self, '_download_ts', '')} | Downloaded By: Student / Official"
        page_text = f"{self._page_word} {self._pageNumber} / {page_count}"
        self.drawString(36, 20, txt_left)
        self.drawRightString(letter[0] - 36, 20, page_text)
        self.restoreState()


def generate_student_result_pdf(
    result: Any,
    student: Any,
    exam: Any,
    downloaded_by: Any = None,
    lang: str = "en"
) -> bytes:
    """Generate official Student Examination Result Scorecard & Performance Transcript.
    Supports all 7 languages (en, mr, hi, te, ta, ml, kn) using system Indic fonts.
    Adheres strictly to modern academic styling, server-side timestamps, exact examiner remarks,
    and authoritative performance reporting.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=32,
        bottomMargin=42
    )

    i18n = PDF_I18N.get(lang, PDF_I18N["en"])
    font_reg = FONT_REGULAR
    font_bld = FONT_BOLD

    styles = getSampleStyleSheet()

    server_now = datetime.now(timezone.utc)
    download_ts_str = server_now.strftime("%Y-%m-%d %H:%M:%S UTC")

    brand_style = ParagraphStyle(
        "BrandHeader",
        parent=styles["Normal"],
        fontName=font_bld,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#E06A26"),
        alignment=1,
        spaceAfter=3
    )
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontName=font_bld,
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#1C1C1F"),
        alignment=1,
        spaceAfter=3
    )
    sub_style = ParagraphStyle(
        "CertSub",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#6B6B76"),
        alignment=1,
        spaceAfter=10
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName=font_bld,
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1C1C1F"),
        spaceBefore=8,
        spaceAfter=4
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1C1C1F")
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName=font_bld,
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1C1C1F")
    )
    table_cell_muted = ParagraphStyle(
        "TableCellMuted",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#6B6B76")
    )

    elements = [
        Paragraph(i18n["brand_title"], brand_style),
        Paragraph(i18n["doc_title"], title_style),
        Paragraph(i18n["doc_subtitle"], sub_style),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E06A26"), spaceBefore=0, spaceAfter=8)
    ]

    session = getattr(result, "session", None)
    answers = session.answers if session else []
    ans_map = {a.question_id: a for a in answers}

    # Attempt count and questions in paper
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

    if result.status in ["PASSED", "FAILED"]:
        is_passed = (result.status == "PASSED")
    else:
        is_passed = result.percentage >= 50.0
    outcome_str = i18n["status_passed"] if is_passed else i18n["status_failed"]
    outcome_color = colors.HexColor("#2B7853") if is_passed else colors.HexColor("#C85332")

    # Timestamps formatted
    created_ts = result.created_at.strftime("%Y-%m-%d") if result.created_at else "N/A"
    started_ts = session.started_at.strftime("%Y-%m-%d %H:%M:%S UTC") if session and session.started_at else "N/A"
    submitted_ts = session.submitted_at.strftime("%Y-%m-%d %H:%M:%S UTC") if session and session.submitted_at else "N/A"
    finalized_ts = result.evaluation_finalized_at.strftime("%Y-%m-%d %H:%M:%S UTC") if getattr(result, "evaluation_finalized_at", None) else submitted_ts
    published_ts = result.result_published_at.strftime("%Y-%m-%d %H:%M:%S UTC") if getattr(result, "result_published_at", None) else server_now.strftime("%Y-%m-%d %H:%M:%S UTC")

    reg_number = student.registration_number or (student.student_profile.enrollment_number if student.student_profile else "REG-UNASSIGNED")

    # 1. Candidate & Exam Information Table
    elements.append(Paragraph(i18n["sec_1_title"], section_heading))
    candidate_table_data = [
        [
            Paragraph(f"<b>{i18n['lbl_candidate_name']}</b>", table_cell),
            Paragraph(student.name, table_cell_bold),
            Paragraph(f"<b>{i18n['lbl_exam_title']}</b>", table_cell),
            Paragraph(exam.name, table_cell_bold)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_roll_no']}</b>", table_cell),
            Paragraph(reg_number, table_cell),
            Paragraph(f"<b>{i18n['lbl_subject']}</b>", table_cell),
            Paragraph(exam.subject, table_cell)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_email']}</b>", table_cell),
            Paragraph(student.email, table_cell),
            Paragraph(f"<b>{i18n['lbl_exam_id']}</b>", table_cell),
            Paragraph(f"EXAM-{exam.id:04d}", table_cell)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_exam_date']}</b>", table_cell),
            Paragraph(created_ts, table_cell),
            Paragraph(f"<b>{i18n['lbl_attempt']}</b>", table_cell),
            Paragraph(f"#{attempt_num}", table_cell_bold)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_started_at']}</b>", table_cell),
            Paragraph(started_ts, table_cell_muted),
            Paragraph(f"<b>{i18n['lbl_submitted_at']}</b>", table_cell),
            Paragraph(submitted_ts, table_cell_muted)
        ]
    ]

    t_cand = Table(candidate_table_data, colWidths=[120, 150, 110, 160])
    t_cand.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FAF8F5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#EAE6DF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(t_cand)
    elements.append(Spacer(1, 8))

    # 2. Performance & Evaluation Summary
    elements.append(Paragraph(i18n["sec_2_title"], section_heading))

    objective_count = sum(1 for q in questions_in_paper if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT])
    subjective_count = sum(1 for q in questions_in_paper if q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD])
    total_q_count = len(questions_in_paper) if questions_in_paper else 1

    # Compute negative deducted
    negative_deducted = 0.0
    for ans in answers:
        if ans.marks_awarded is not None and ans.marks_awarded < 0:
            negative_deducted += abs(ans.marks_awarded)

    eval_status_str = getattr(result, "evaluation_status", None) or "PUBLISHED"

    perf_headers = [
        Paragraph(f"<b>{i18n['col_max_marks']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_obtained_marks']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_percentage']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_outcome']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_negative_ded']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_eval_status']}</b>", table_cell_bold),
    ]
    perf_values = [
        Paragraph(f"<b>{result.maximum_marks:.1f}</b>", table_cell_bold),
        Paragraph(f"<font color='#E06A26'><b>{result.total_marks:.1f}</b></font>", table_cell_bold),
        Paragraph(f"<b>{result.percentage:.1f}%</b>", table_cell_bold),
        Paragraph(f"<font color='{outcome_color.hexval()}'><b>{outcome_str}</b></font>", table_cell_bold),
        Paragraph(f"<b>{f'-{negative_deducted:.1f}' if negative_deducted > 0 else '0.0'}</b>", table_cell_bold),
        Paragraph(f"<b>{eval_status_str}</b>", table_cell_bold),
    ]

    t_perf = Table([perf_headers, perf_values], colWidths=[90, 90, 85, 105, 90, 80])
    t_perf.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1C1C1F")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#FAF8F5")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#FFFFFF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1C1C1F")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
        ('TOPPADDING', (0, 1), (-1, 1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 5),
    ]))
    elements.append(t_perf)
    elements.append(Spacer(1, 8))

    # 3. Itemized Question Results Table
    from app.services.question_translations import get_question_translations
    elements.append(Paragraph(f"{i18n['sec_3_title']} ({total_q_count} Items: {objective_count} Objective, {subjective_count} Subjective)", section_heading))

    q_headers = [
        Paragraph(f"<b>{i18n['col_hash']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_q_type']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_q_statement']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_q_max']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_q_awarded']}</b>", table_cell_bold),
        Paragraph(f"<b>{i18n['col_q_status']}</b>", table_cell_bold),
    ]
    q_table_data = [q_headers]

    for idx, q in enumerate(questions_in_paper, 1):
        ans = ans_map.get(q.id)
        q_type_str = q.question_type.value.replace("_", " ")

        # Multilingual question text
        q_text = q.question_text
        if lang != "en":
            tr = get_question_translations(q.question_text)
            if tr and lang in tr:
                q_text = tr[lang]

        q_text_snippet = (q_text[:72] + "...") if len(q_text) > 75 else q_text
        awarded_str = f"{ans.marks_awarded:.1f}" if (ans and ans.marks_awarded is not None) else "0.0"

        status_flag = i18n["status_evaluated"]
        if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            status_flag = i18n["status_auto_evaluated"]
        elif ans and getattr(ans, "is_evaluated", False):
            status_flag = i18n["status_faculty_graded"]

        q_table_data.append([
            Paragraph(f"Q{idx}", table_cell),
            Paragraph(q_type_str, table_cell),
            Paragraph(q_text_snippet, table_cell),
            Paragraph(f"{q.marks:.1f}", table_cell),
            Paragraph(f"<b>{awarded_str}</b>", table_cell),
            Paragraph(f"<font color='#2B7853'>{status_flag}</font>", table_cell)
        ])

    t_questions = Table(q_table_data, colWidths=[28, 85, 241, 55, 65, 66])
    t_questions.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#242428")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#FAF8F5")),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (4, -1), 'CENTER'),
        ('ALIGN', (5, 0), (5, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#DFD9CF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
    ]))
    elements.append(t_questions)
    elements.append(Spacer(1, 8))

    # 4. Examiner Remarks & Attestation Section
    elements.append(Paragraph(i18n["sec_4_title"], section_heading))

    remarks_text = result.evaluator_remarks.strip() if getattr(result, "evaluator_remarks", None) and result.evaluator_remarks.strip() else i18n["no_remarks"]

    evaluator_name = "Institutional Board of Faculty Examiners"
    evaluator_role = "ACADEMIC EXAMINER"
    if getattr(result, "evaluator", None):
        evaluator_name = result.evaluator.name
        evaluator_role = result.evaluator.role.value if hasattr(result.evaluator.role, "value") else str(result.evaluator.role)

    remarks_data = [
        [
            Paragraph(f"<b>{i18n['lbl_evaluator_remarks']}</b>", table_cell),
            Paragraph(f"<i>&ldquo;{remarks_text}&rdquo;</i>", table_cell)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_evaluated_by']}</b>", table_cell),
            Paragraph(f"{evaluator_name} &bull; <font color='#6B6B76'>({evaluator_role})</font>", table_cell)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_finalized_on']}</b>", table_cell),
            Paragraph(f"<font color='#1C1C1F'>{finalized_ts}</font>", table_cell)
        ],
        [
            Paragraph(f"<b>{i18n['lbl_published_on']}</b>", table_cell),
            Paragraph(f"<font color='#2B7853'><b>{published_ts}</b></font>", table_cell)
        ]
    ]

    t_remarks = Table(remarks_data, colWidths=[150, 390])
    t_remarks.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FAF8F5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#EAE6DF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE6DF")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(t_remarks)
    elements.append(Spacer(1, 6))

    # 5. Attestation Note
    attest_para = Paragraph(
        f"<b>{i18n['attestation_title']}</b> {i18n['attestation_body']}",
        table_cell_muted
    )
    elements.append(attest_para)

    # Canvasmaker with server timestamp injection and multilingual footer
    def make_canvas(*args, **kwargs):
        c = NumberedCanvas(*args, **kwargs)
        c._download_ts = download_ts_str
        c._font_regular = font_reg
        c._footer_left = i18n["footer_downloaded_on"]
        c._page_word = i18n["page_str"]
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
        status_str = r.status if r.status in ["PASSED", "FAILED"] else ("PASSED" if r.percentage >= 50.0 else "FAILED")
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

