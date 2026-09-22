"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Globe, Check } from "lucide-react";

export type Language = "en" | "mr" | "hi" | "te" | "ta" | "ml" | "kn";

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "Home",
    dashboard: "Dashboard",
    exams: "Exams",
    question_bank: "Question Bank",
    results: "Results",
    candidates: "Candidates",
    users: "Users",
    analytics: "Analytics",
    profile: "Profile",
    login: "Sign In",
    register: "Register",
    logout: "Sign Out",
    language: "Language",

    // Roles
    student: "Student",
    examiner: "Examiner",
    admin: "Admin",

    // Auth
    sign_in_title: "IntelliExamAI Portal Access",
    sign_in_subtitle: "Select your institutional authorization tier to proceed",
    student_login: "Student Login",
    examiner_login: "Examiner Login",
    admin_login: "Admin Login",
    email_address: "Email Address",
    password: "Password",
    forgot_password: "Forgot Password?",
    sign_in_button: "Authorize & Sign In",
    no_account: "New student candidate?",
    register_here: "Register for an account",
    student_registration_title: "Candidate Enrollment",
    student_registration_subtitle: "Register your institutional academic profile",
    full_name: "Full Legal Name",
    registration_number: "Registration Number",
    confirm_password: "Confirm Password",
    create_account: "Complete Registration",

    // Student Dashboard
    welcome_back: "Welcome back",
    available_exams: "Available Assessments",
    upcoming_exams: "Upcoming",
    completed_exams: "Completed",
    all_exams: "All Assessments",
    start_exam: "Start Exam",
    start_reattempt: "Start Re-Attempt",
    view_result: "View Scorecard",
    register_exam: "Register",
    registered_badge: "Registered",
    reattempt_ready: "Re-Attempt Ready",
    duration: "Duration",
    questions: "Questions",
    total_marks: "Total Marks",
    minutes: "Minutes",

    // Exam Instructions
    instructions_title: "Examination Regulations & Code of Conduct",
    accept_and_start: "Accept & Start Exam",
    rule_1: "Ensure a stable internet connection throughout the examination duration.",
    rule_2: "Webcam proctoring is continuously active. Your face must remain visible.",
    rule_3: "Navigating away from this window, switching tabs, or exiting fullscreen is recorded.",
    rule_4: "Exceeding allowable tab switch violations will automatically submit your attempt.",
    confirm_instructions: "I have read, understood, and agree to abide by the assessment rules.",

    // Exam Attempt Workspace
    time_remaining: "Time Remaining",
    synced_server: "Synced with Server",
    question: "Question",
    of: "of",
    marks: "Marks",
    negative_marking: "Negative Marking",
    multiple_choice: "Single Choice (MCQ)",
    multi_select: "Multiple Choice",
    short_answer: "Short Answer",
    long_answer: "Long Answer Essay",
    image_solution: "Diagram / Handwritten Solution",
    clear_response: "Clear Response",
    previous: "Previous",
    next: "Next",
    mark_review: "Mark for Review",
    unmark_review: "Unmark Review",
    review_and_submit: "Review & Submit",
    submit_assessment: "Submit Examination",
    words: "Words",
    characters: "Characters",
    limit_exceeded: "Limit Exceeded",
    upload_image: "Upload Image",
    capture_camera: "Capture from Camera",
    take_photo: "Take Photo",
    retake_photo: "Retake",
    use_photo: "Use Photo",
    open_camera: "Open Camera",
    live_proctoring: "Live Proctoring",
    monitoring_active: "Monitoring Active",

    // Results & Scorecards
    scorecard_title: "Official Performance Scorecard",
    total_score: "Total Score",
    percentage: "Percentage",
    status_passed: "Passed",
    status_failed: "Needs Improvement",
    download_pdf: "Download Verified PDF Transcript",
    question_breakdown: "Itemized Question Evaluation",
    examiner_feedback: "Evaluator Feedback",

    // Re-Attempt Messages
    attempt_completed_notice: "Your attempt has been completed. No additional attempt is currently available.",
    pending_admin_approval: "Pending Admin Approval",
    active_authorized: "Authorized / Active",
    rejected: "Rejected",
    revoked: "Revoked",

    // Admin Console
    admin_console: "Administrator Command Center",
    enrolled_students: "Enrolled Students",
    faculty_examiners: "Faculty Examiners",
    active_sessions: "Live Assessment Sessions",
    reattempt_approvals: "Re-Attempt Approvals",
    approve: "Approve",
    reject: "Reject",
    revoke: "Revoke",
    grant_reattempt: "Direct Grant Re-Attempt",
    notifications: "Notifications",
    change_password: "Change Password",
    reason: "Reason",
    submit_request: "Submit Request",
    cancel: "Cancel",
    pending: "Pending",
    approved: "Approved",
  },

  mr: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "मुख्यपृष्ठ",
    dashboard: "डॅशबोर्ड",
    exams: "परीक्षा",
    question_bank: "प्रश्नसंच",
    results: "निकाल",
    candidates: "उमेदवार",
    users: "वापरकर्ते",
    analytics: "विश्लेषण",
    profile: "प्रोफाइल",
    login: "लॉगिन करा",
    register: "नोंदणी करा",
    logout: "बाहेर पडा",
    language: "भाषा",

    // Roles
    student: "विद्यार्थी",
    examiner: "परीक्षक",
    admin: "प्रशासक",

    // Auth
    sign_in_title: "IntelliExamAI पोर्टल प्रवेश",
    sign_in_subtitle: "पुढे जाण्यासाठी आपली संस्थात्मक भूमिका निवडा",
    student_login: "विद्यार्थी लॉगिन",
    examiner_login: "परीक्षक लॉगिन",
    admin_login: "प्रशासक लॉगिन",
    email_address: "ईमेल पत्ता",
    password: "पासवर्ड",
    forgot_password: "पासवर्ड विसरलात?",
    sign_in_button: "प्रवेश करा",
    no_account: "नवीन विद्यार्थी?",
    register_here: "येथे नोंदणी करा",
    student_registration_title: "उमेदवार नोंदणी",
    student_registration_subtitle: "आपली अधिकृत शैक्षणिक माहिती नोंदवा",
    full_name: "संपूर्ण नाव",
    registration_number: "नोंदणी क्रमांक",
    confirm_password: "पासवर्ड पुष्टी करा",
    create_account: "नोंदणी पूर्ण करा",

    // Student Dashboard
    welcome_back: "पुन्हा स्वागत आहे",
    available_exams: "उपलब्ध परीक्षा",
    upcoming_exams: "आगामी परीक्षा",
    completed_exams: "पूर्ण झालेल्या परीक्षा",
    all_exams: "सर्व परीक्षा",
    start_exam: "परीक्षा सुरू करा",
    start_reattempt: "पुनः प्रयत्न सुरू करा",
    view_result: "गुणपत्रिका पहा",
    register_exam: "नोंदणी करा",
    registered_badge: "नोंदणीकृत",
    reattempt_ready: "पुनः प्रयत्न सज्ज",
    duration: "कालावधी",
    questions: "प्रश्न",
    total_marks: "एकूण गुण",
    minutes: "मिनिटे",

    // Exam Instructions
    instructions_title: "परीक्षा नियम व मार्गदर्शक तत्त्वे",
    accept_and_start: "स्वीकारा आणि परीक्षा सुरू करा",
    rule_1: "परीक्षेदरम्यान अखंड इंटरनेट कनेक्शन असणे आवश्यक आहे.",
    rule_2: "वेबकॅम सतत चालू राहील. आपला चेहरा स्पष्टपणे दिसला पाहिजे.",
    rule_3: "टॅब बदलणे किंवा स्क्रीनवरून बाजूला जाणे नोंदवले जाईल.",
    rule_4: "मर्यादेपेक्षा जास्त टॅब बदलल्यास परीक्षा आपोआप जमा होईल.",
    confirm_instructions: "मी सर्व नियम काळजीपूर्वक वाचले आहेत आणि ते मला मान्य आहेत.",

    // Exam Attempt Workspace
    time_remaining: "उरलेला वेळ",
    synced_server: "सर्व्हरशी जोडलेले",
    question: "प्रश्न",
    of: "पैकी",
    marks: "गुण",
    negative_marking: "नकारात्मक गुण",
    multiple_choice: "पर्यायी प्रश्न (MCQ)",
    multi_select: "बहु-निवड प्रश्न",
    short_answer: "लघुत्तरी प्रश्न",
    long_answer: "दीर्घोत्तरी निबंध",
    image_solution: "आकृती / हस्तलिखित उत्तर",
    clear_response: "उत्तर खोडा",
    previous: "मागे",
    next: "पुढे",
    mark_review: "पुनरावलोकनासाठी चिन्हांकित करा",
    unmark_review: "चिन्ह काढा",
    review_and_submit: "तपासा आणि जमा करा",
    submit_assessment: "परीक्षा सबमिट करा",
    words: "शब्द",
    characters: "अक्षरे",
    limit_exceeded: "मर्यादा ओलांडली",
    upload_image: "प्रतिमा अपलोड करा",
    capture_camera: "कॅमेऱ्यातून फोटो घ्या",
    take_photo: "फोटो काढा",
    retake_photo: "पुन्हा काढा",
    use_photo: "हा फोटो वापरा",
    open_camera: "कॅमेरा उघडा",
    live_proctoring: "थेट पाळत (Proctoring)",
    monitoring_active: "निरीक्षण सुरू आहे",

    // Results & Scorecards
    scorecard_title: "अधिकृत कार्यक्षमता गुणपत्रिका",
    total_score: "एकूण गुण",
    percentage: "टक्केवारी",
    status_passed: "उत्तीर्ण",
    status_failed: "सुधारणा आवश्यक",
    download_pdf: "प्रमाणित PDF डाउनलोड करा",
    question_breakdown: "प्रश्ननिहाय तपशील",
    examiner_feedback: "परीक्षकांचा अभिप्राय",

    // Re-Attempt Messages
    attempt_completed_notice: "तुमचा प्रयत्न पूर्ण झाला आहे. सध्या कोणताही अतिरिक्त प्रयत्न उपलब्ध नाही.",
    pending_admin_approval: "प्रशासक मंजुरी प्रलंबित",
    active_authorized: "मंजूर / सक्रिय",
    rejected: "नाकारले",
    revoked: "रद्द केले",

    // Admin Console
    admin_console: "प्रशासक नियंत्रण केंद्र",
    enrolled_students: "नोंदणीकृत विद्यार्थी",
    faculty_examiners: "परीक्षक शिक्षक",
    active_sessions: "सुरू असलेल्या परीक्षा",
    reattempt_approvals: "पुनः प्रयत्न मंजुऱ्या",
    approve: "मंजूर करा",
    reject: "नाकारा",
    revoke: "रद्द करा",
    grant_reattempt: "थेट पुनर्रप्रयत्न मंजूर करा",
    notifications: "सूचना",
    change_password: "पासवर्ड बदला",
    reason: "कारण",
    submit_request: "विनंती सबमिट करा",
    cancel: "रद्द करा",
    pending: "प्रलंबित",
    approved: "मंजूर",
  },

  hi: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "होम",
    dashboard: "डैशबोर्ड",
    exams: "परीक्षाएं",
    question_bank: "प्रश्न बैंक",
    results: "परिणाम",
    candidates: "उम्मीदवार",
    users: "उपयोगकर्ता",
    analytics: "एनालिटिक्स",
    profile: "प्रोफ़ाइल",
    login: "लॉग इन",
    register: "पंजीकरण",
    logout: "लॉग आउट",
    language: "भाषा",

    // Roles
    student: "छात्र",
    examiner: "परीक्षक",
    admin: "प्रशासक",

    // Auth
    sign_in_title: "IntelliExamAI पोर्टल लॉगिन",
    sign_in_subtitle: "जारी रखने के लिए अपनी संस्थागत भूमिका चुनें",
    student_login: "छात्र लॉगिन",
    examiner_login: "परीक्षक लॉगिन",
    admin_login: "प्रशासक लॉगिन",
    email_address: "ईमेल पता",
    password: "पासवर्ड",
    forgot_password: "पासवर्ड भूल गए?",
    sign_in_button: "लॉग इन करें",
    no_account: "नए छात्र हैं?",
    register_here: "पंजीकरण करें",
    student_registration_title: "उम्मीदवार पंजीकरण",
    student_registration_subtitle: "अपना शैक्षणिक विवरण दर्ज करें",
    full_name: "पूरा नाम",
    registration_number: "पंजीकरण संख्या",
    confirm_password: "पासवर्ड की पुष्टि करें",
    create_account: "पंजीकरण पूरा करें",

    // Student Dashboard
    welcome_back: "स्वागत है",
    available_exams: "उपलब्ध परीक्षाएं",
    upcoming_exams: "आगामी परीक्षाएं",
    completed_exams: "पूर्ण परीक्षाएं",
    all_exams: "सभी परीक्षाएं",
    start_exam: "परीक्षा शुरू करें",
    start_reattempt: "पुनः प्रयास शुरू करें",
    view_result: "परिणाम देखें",
    register_exam: "पंजीकरण करें",
    registered_badge: "पंजीकृत",
    reattempt_ready: "पुनः प्रयास तैयार",
    duration: "अवधि",
    questions: "प्रश्न",
    total_marks: "कुल अंक",
    minutes: "मिनट",

    // Exam Instructions
    instructions_title: "परीक्षा नियम और निर्देश",
    accept_and_start: "स्वीकारें और परीक्षा शुरू करें",
    rule_1: "परीक्षा के दौरान स्थिर इंटरनेट कनेक्शन सुनिश्चित करें।",
    rule_2: "वेबकैम लगातार सक्रिय रहेगा। आपका चेहरा हमेशा दिखना चाहिए।",
    rule_3: "टैब बदलना या स्क्रीन छोड़ना सुरक्षा उल्लंघन माना जाएगा।",
    rule_4: "अधिकतम उल्लंघन होने पर परीक्षा अपने आप जमा हो जाएगी।",
    confirm_instructions: "मैंने सभी नियमों को पढ़ लिया है और मैं इनसे सहमत हूं।",

    // Exam Attempt Workspace
    time_remaining: "शेष समय",
    synced_server: "सर्वर से कनेक्टेड",
    question: "प्रश्न",
    of: "का",
    marks: "अंक",
    negative_marking: "नकारात्मक अंकन",
    multiple_choice: "बहुविकल्पीय (MCQ)",
    multi_select: "बहु-चयन",
    short_answer: "लघु उत्तर",
    long_answer: "दीर्घ उत्तर",
    image_solution: "आरेख / हस्तलिखित उत्तर",
    clear_response: "उत्तर हटाएं",
    previous: "पिछला",
    next: "अगला",
    mark_review: "समीक्षा के लिए चिह्नित करें",
    unmark_review: "चिह्न हटाएं",
    review_and_submit: "समीक्षा करें और जमा करें",
    submit_assessment: "परीक्षा सबमिट करें",
    words: "शब्द",
    characters: "अक्षर",
    limit_exceeded: "सीमा पार",
    upload_image: "छवि अपलोड करें",
    capture_camera: "कैमरे से फोटो लें",
    take_photo: "फोटो लें",
    retake_photo: "दोबारा लें",
    use_photo: "यह फोटो उपयोग करें",
    open_camera: "कैमरा खोलें",
    live_proctoring: "लाइव प्रॉक्टरिंग",
    monitoring_active: "निगरानी सक्रिय",

    // Results & Scorecards
    scorecard_title: "आधिकारिक परीक्षा स्कोरकार्ड",
    total_score: "कुल प्राप्तांक",
    percentage: "प्रतिशत",
    status_passed: "उत्तीर्ण",
    status_failed: "सुधार की आवश्यकता",
    download_pdf: "सत्यापित PDF डाउनलोड करें",
    question_breakdown: "प्रश्नानुसार मूल्यांकन",
    examiner_feedback: "परीक्षक की प्रतिक्रिया",

    // Re-Attempt Messages
    attempt_completed_notice: "आपका प्रयास पूर्ण हो गया है। वर्तमान में कोई अतिरिक्त प्रयास उपलब्ध नहीं है।",
    pending_admin_approval: "प्रशासक अनुमोदन लंबित",
    active_authorized: "अनुमोदित / सक्रिय",
    rejected: "अस्वीकृत",
    revoked: "रद्द",

    // Admin Console
    admin_console: "प्रशासक नियंत्रण केंद्र",
    enrolled_students: "नामांकित छात्र",
    faculty_examiners: "संकाय परीक्षक",
    active_sessions: "सक्रिय परीक्षा सत्र",
    reattempt_approvals: "पुनः प्रयास अनुमोदन",
    approve: "स्वीकृत करें",
    reject: "अस्वीकार करें",
    revoke: "रद्द करें",
    grant_reattempt: "सीधा पुनः प्रयास प्रदान करें",
    notifications: "सूचनाएं",
    change_password: "पासवर्ड बदलें",
    reason: "कारण",
    submit_request: "अनुरोध सबमिट करें",
    cancel: "रद्द करें",
    pending: "लंबित",
    approved: "अनुमोदित",
  },

  te: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "హోమ్",
    dashboard: "డాష్‌బోర్డ్",
    exams: "పరీక్షలు",
    question_bank: "ప్రశ్నల నిధి",
    results: "ఫలితాలు",
    candidates: "అభ్యర్థులు",
    users: "వినియోగదారులు",
    analytics: "విశ్లేషణ",
    profile: "ప్రొఫైల్",
    login: "లాగిన్",
    register: "నమోదు",
    logout: "లాగ్ అవుట్",
    language: "భాష",

    // Roles
    student: "విద్యార్థి",
    examiner: "పరీక్షకుడు",
    admin: "నిర్వాహకుడు",

    // Auth
    sign_in_title: "IntelliExamAI పోర్టల్ ప్రవేశం",
    sign_in_subtitle: "కొనసాగించడానికి మీ విద్యా పాత్రను ఎంచుకోండి",
    student_login: "విద్యార్థి లాగిన్",
    examiner_login: "పరీక్షకుని లాగిన్",
    admin_login: "నిర్వాహకుని లాగిన్",
    email_address: "ఇమెయిల్ చిరునామా",
    password: "పాస్‌వర్డ్",
    forgot_password: "పాస్‌వర్డ్ మర్చిపోయారా?",
    sign_in_button: "లాగిన్ అవ్వండి",
    no_account: "కొత్త అభ్యర్థా?",
    register_here: "ఇక్కడ నమోదు చేసుకోండి",
    student_registration_title: "అభ్యర్థి నమోదు",
    student_registration_subtitle: "మీ విద్యా వివరాలను నమోదు చేయండి",
    full_name: "పూర్తి పేరు",
    registration_number: "రిజిస్ట్రేషన్ సంఖ్య",
    confirm_password: "పాస్‌వర్డ్ నిర్ధారించండి",
    create_account: "నమోదు పూర్తి చేయండి",

    // Student Dashboard
    welcome_back: "తిరిగి స్వాగతం",
    available_exams: "అందుబాటులో ఉన్న పరీక్షలు",
    upcoming_exams: "రాబోయే పరీక్షలు",
    completed_exams: "పూర్తయిన పరీక్షలు",
    all_exams: "అన్ని పరీక్షలు",
    start_exam: "పరీక్ష ప్రారంభించండి",
    start_reattempt: "మరలా ప్రయత్నించండి",
    view_result: "ఫలితాలు చూడండి",
    register_exam: "నమోదు చేసుకోండి",
    registered_badge: "నమోదైంది",
    reattempt_ready: "పునఃప్రయత్నం సిద్ధం",
    duration: "వ్యవధి",
    questions: "ప్రశ్నలు",
    total_marks: "మొత్తం మార్కులు",
    minutes: "నిమిషాలు",

    // Exam Instructions
    instructions_title: "పరీక్ష నిబంధనలు మరియు సూచనలు",
    accept_and_start: "అంగీకరించి పరీక్ష ప్రారంభించండి",
    rule_1: "పరీక్ష అంతటా స్థిరమైన ఇంటర్నెట్ కనెక్షన్ ఉండాలి.",
    rule_2: "వెబ్‌క్యామ్ నిరంతరం ఆన్‌లో ఉంటుంది. మీ ముఖం స్పష్టంగా కనిపించాలి.",
    rule_3: "స్క్రీన్ నుండి వేరే ట్యాబ్‌కు మారడం ఉల్లంఘనగా పరిగణించబడుతుంది.",
    rule_4: "పరిమితి దాటితే పరీక్ష స్వయంచాలకంగా సమర్పించబడుతుంది.",
    confirm_instructions: "నేను అన్ని నియమాలను చదివాను మరియు వాటికి అంగీకరిస్తున్నాను.",

    // Exam Attempt Workspace
    time_remaining: "మిగిలిన సమయం",
    synced_server: "సర్వర్‌తో సమకాలీకరించబడింది",
    question: "ప్రశ్న",
    of: "లో",
    marks: "మార్కులు",
    negative_marking: "నెగటివ్ మార్కింగ్",
    multiple_choice: "బహుళైచ్ఛికం (MCQ)",
    multi_select: "బహుళ ఎంపిక",
    short_answer: "సంక్షిప్త సమాధానం",
    long_answer: "వివరణాత్మక సమాధానం",
    image_solution: "చిత్రం / చేతివ్రాత సమాధానం",
    clear_response: "సమాధానం తొలగించండి",
    previous: "మునుపటి",
    next: "తదుపరి",
    mark_review: "సమీక్ష కోసం గుర్తించండి",
    unmark_review: "గుర్తు తొలగించండి",
    review_and_submit: "సమీక్షించి సమర్పించండి",
    submit_assessment: "పరీక్ష సమర్పించండి",
    words: "పదాలు",
    characters: "అక్షరాలు",
    limit_exceeded: "పరిమితి మించింది",
    upload_image: "చిత్రం అప్‌లోడ్ చేయండి",
    capture_camera: "కెమెరా ద్వారా ఫోటో తీయండి",
    take_photo: "ఫోటో తీయండి",
    retake_photo: "మళ్ళీ తీయండి",
    use_photo: "ఈ ఫోటోను ఉపయోగించండి",
    open_camera: "కెమెరా తెరవండి",
    live_proctoring: "లైవ్ పర్యవేక్షణ",
    monitoring_active: "నిఘా చురుకుగా ఉంది",

    // Results & Scorecards
    scorecard_title: "అధికారిక పనితీరు స్కోర్‌కార్డ్",
    total_score: "మొత్తం స్కోరు",
    percentage: "శాతం",
    status_passed: "ఉత్తీర్ణత",
    status_failed: "మెరుగుదల అవసరం",
    download_pdf: "ధృవీకరించబడిన PDF డౌన్‌లోడ్ చేయండి",
    question_breakdown: "ప్రశ్నల వారీ విశ్లేషణ",
    examiner_feedback: "పరీక్షకుని అభిప్రాయం",

    // Re-Attempt Messages
    attempt_completed_notice: "మీ పరీక్ష పూర్తయింది. ప్రస్తుతం అదనపు ప్రయత్నాలు అందుబాటులో లేవు.",
    pending_admin_approval: "నిర్వాహకుని ఆమోదం పెండింగ్‌లో ఉంది",
    active_authorized: "ఆమోదించబడింది / సక్రియం",
    rejected: "తిరస్కరించబడింది",
    revoked: "రద్దు చేయబడింది",

    // Admin Console
    admin_console: "నిర్వాహక కమాండ్ సెంటర్",
    enrolled_students: "నమోదైన విద్యార్థులు",
    faculty_examiners: "అధ్యాపక పరీక్షకులు",
    active_sessions: "సక్రియ పరీక్ష సెషన్లు",
    reattempt_approvals: "పునఃప్రయత్న ఆమోదాలు",
    approve: "ఆమోదించండి",
    reject: "తిరస్కరించండి",
    revoke: "రద్దు చేయండి",
    grant_reattempt: "నేరుగా అనుమతి ఇవ్వండి",
    notifications: "నోటిఫికేషన్లు",
    change_password: "పాస్‌వర్డ్ మార్చండి",
    reason: "కారణం",
    submit_request: "అభ్యర్థనను సమర్పించండి",
    cancel: "రద్దు చేయండి",
    pending: "పెండింగ్‌లో ఉంది",
    approved: "ఆమోదించబడింది",
  },

  ta: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "முகப்பு",
    dashboard: "டாஷ்போர்டு",
    exams: "தேர்வுகள்",
    question_bank: "வினா வங்கி",
    results: "முடிவுகள்",
    candidates: "தேர்வர்கள்",
    users: "பயனர்கள்",
    analytics: "பகுப்பாய்வு",
    profile: "சுயவிவரம்",
    login: "உள்நுழைக",
    register: "பதிவு செய்க",
    logout: "வெளியேறு",
    language: "மொழி",

    // Roles
    student: "மாணவர்",
    examiner: "தேர்வாளர்",
    admin: "நிர்வாகி",

    // Auth
    sign_in_title: "IntelliExamAI போர்ட்டல் அணுகல்",
    sign_in_subtitle: "தொடர உங்கள் நிறுவனப் பங்கைத் தேர்ந்தெடுக்கவும்",
    student_login: "மாணவர் உள்நுழைவு",
    examiner_login: "தேர்வாளர் உள்நுழைவு",
    admin_login: "நிர்வாகி உள்நுழைவு",
    email_address: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    forgot_password: "கடவுச்சொல் மறந்துவிட்டதா?",
    sign_in_button: "உள்நுழையவும்",
    no_account: "புதிய மாணவரா?",
    register_here: "இங்கே பதிவு செய்யவும்",
    student_registration_title: "மாணவர் சேர்க்கை",
    student_registration_subtitle: "உங்கள் கல்வி விவரங்களை உள்ளிடவும்",
    full_name: "முழுப் பெயர்",
    registration_number: "பதிவு எண்",
    confirm_password: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    create_account: "பதிவை முடிக்கவும்",

    // Student Dashboard
    welcome_back: "மீண்டும் வருக",
    available_exams: "கிடைக்கும் தேர்வுகள்",
    upcoming_exams: "வரவிருக்கும் தேர்வுகள்",
    completed_exams: "முடிந்த தேர்வுகள்",
    all_exams: "அனைத்துத் தேர்வுகள்",
    start_exam: "தேர்வைத் தொடங்கு",
    start_reattempt: "மீண்டும் தொடங்கு",
    view_result: "மதிப்பெண் அட்டை காண்க",
    register_exam: "பதிவு செய்க",
    registered_badge: "பதிவு செய்யப்பட்டது",
    reattempt_ready: "மறுமுயற்சி தயார்",
    duration: "கால அளவு",
    questions: "கேள்விகள்",
    total_marks: "மொத்த மதிப்பெண்கள்",
    minutes: "நிமிடங்கள்",

    // Exam Instructions
    instructions_title: "தேர்வு விதிகள் மற்றும் விதிமுறைகள்",
    accept_and_start: "ஏற்று தேர்வைத் தொடங்கு",
    rule_1: "தேர்வின் போது தடையில்லா இணைய இணைப்பு இருப்பதை உறுதி செய்யவும்.",
    rule_2: "வெப்கேம் எப்போதும் ஆன்-ல் இருக்க வேண்டும். முகம் தெளிவாகத் தெரிய வேண்டும்.",
    rule_3: "திரையை விட்டு வெளியேறுவது அல்லது தாவல்களை மாற்றுவது பதிவாகும்.",
    rule_4: "அதிகபட்ச எச்சரிக்கைகளுக்குப் பிறகு தேர்வு தானாகவே சமர்ப்பிக்கப்படும்.",
    confirm_instructions: "நான் அனைத்து விதிகளையும் படித்து புரிந்துகொண்டேன்.",

    // Exam Attempt Workspace
    time_remaining: "மீதமுள்ள நேரம்",
    synced_server: "சேவையகத்துடன் இணைக்கப்பட்டது",
    question: "கேள்வி",
    of: "இல்",
    marks: "மதிப்பெண்கள்",
    negative_marking: "எதிர்மறை மதிப்பெண்",
    multiple_choice: "பலவுள் தெரிவு (MCQ)",
    multi_select: "பல்வேறு தேர்வுகள்",
    short_answer: "குறுகிய விடை",
    long_answer: "விரிவான கட்டுரை",
    image_solution: "படம் / கையெழுத்து விடை",
    clear_response: "விடையை அழிக்கவும்",
    previous: "முந்தையது",
    next: "அடுத்தது",
    mark_review: "மறுஆய்வுக்குக் குறிக்கவும்",
    unmark_review: "குறியை நீக்குக",
    review_and_submit: "சரிபார்த்து சமர்ப்பிக்கவும்",
    submit_assessment: "தேர்வை சமர்ப்பிக்கவும்",
    words: "வார்த்தைகள்",
    characters: "எழுத்துக்கள்",
    limit_exceeded: "வரம்பு தாண்டியது",
    upload_image: "படத்தை பதிவேற்றவும்",
    capture_camera: "கேமராவில் படம் எடுக்கவும்",
    take_photo: "படம் எடு",
    retake_photo: "மீண்டும் எடு",
    use_photo: "இப்படத்தைப் பயன்படுத்து",
    open_camera: "கேமராவைத் திற",
    live_proctoring: "நேரலைக் கண்காணிப்பு",
    monitoring_active: "கண்காணிப்பு செயலில் உள்ளது",

    // Results & Scorecards
    scorecard_title: "அதிகாரப்பூர்வ தேர்வு மதிப்பெண் அட்டை",
    total_score: "மொத்த மதிப்பெண்",
    percentage: "சதவீதம்",
    status_passed: "தேர்ச்சி",
    status_failed: "மேம்பாடு தேவை",
    download_pdf: "சான்றளிக்கப்பட்ட PDF பதிவிறக்குக",
    question_breakdown: "கேள்வி வாரியான மதிப்பீடு",
    examiner_feedback: "தேர்வாளரின் கருத்து",

    // Re-Attempt Messages
    attempt_completed_notice: "உங்கள் முயற்சி முடிந்தது. தற்போது கூடுதல் முயற்சி எதுவும் கிடைக்கவில்லை.",
    pending_admin_approval: "நிர்வாகி ஒப்புதல் நிலுவையில் உள்ளது",
    active_authorized: "அங்கீகரிக்கப்பட்டது / செயலில் உள்ளது",
    rejected: "நிராகரிக்கப்பட்டது",
    revoked: "ரத்து செய்யப்பட்டது",

    // Admin Console
    admin_console: "நிர்வாகக் கட்டுப்பாட்டு மையம்",
    enrolled_students: "பதிவுசெய்த மாணவர்கள்",
    faculty_examiners: "ஆசிரியத் தேர்வாளர்கள்",
    active_sessions: "செயலில் உள்ள தேர்வுகள்",
    reattempt_approvals: "மறுமுயற்சி ஒப்புதல்கள்",
    approve: "ஒப்புதல் அளி",
    reject: "நிராகரி",
    revoke: "ரத்துசெய்",
    grant_reattempt: "நேரடி அனுமதி வழங்கு",
    notifications: "அறிவிப்புகள்",
    change_password: "கடவுச்சொல்லை மாற்றவும்",
    reason: "காரணம்",
    submit_request: "கோரிக்கையை சமர்ப்பிக்கவும்",
    cancel: "ரத்துசெய்",
    pending: "நிலுவையில் உள்ளது",
    approved: "அங்கீகரிக்கப்பட்டது",
  },

  ml: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "ഹോം",
    dashboard: "ഡാഷ്‌ബോർഡ്",
    exams: "പരീക്ഷകൾ",
    question_bank: "ചോദ്യശേഖരം",
    results: "ഫലങ്ങൾ",
    candidates: "പരീക്ഷാർത്ഥികൾ",
    users: "ഉപയോക്താക്കൾ",
    analytics: "അനലിറ്റിക്സ്",
    profile: "പ്രൊഫൈൽ",
    login: "പ്രവേശിക്കുക",
    register: "രജിസ്റ്റർ ചെയ്യുക",
    logout: "പുറത്തുകടക്കുക",
    language: "ഭാഷ",

    // Roles
    student: "വിദ്യാർത്ഥി",
    examiner: "പരീക്ഷകൻ",
    admin: "അഡ്മിൻ",

    // Auth
    sign_in_title: "IntelliExamAI പോർട്ടൽ പ്രവേശനം",
    sign_in_subtitle: "തുടരാൻ നിങ്ങളുടെ റൂൾ തിരഞ്ഞെടുക്കുക",
    student_login: "വിദ്യാർത്ഥി ലോഗിൻ",
    examiner_login: "പരീക്ഷക ലോഗിൻ",
    admin_login: "അഡ്മിൻ ലോഗിൻ",
    email_address: "ഇമെയിൽ വിലാസം",
    password: "പാസ്‌വേഡ്",
    forgot_password: "പാസ്‌വേഡ് മറന്നോ?",
    sign_in_button: "പ്രവേശിക്കുക",
    no_account: "പുതിയ വിദ്യാർത്ഥിയാണോ?",
    register_here: "ഇവിടെ രജിസ്റ്റർ ചെയ്യുക",
    student_registration_title: "വിദ്യാർത്ഥി രജിസ്ട്രേഷൻ",
    student_registration_subtitle: "വിദ്യാഭ്യാസ വിവരങ്ങൾ നൽകുക",
    full_name: "മുഴുവൻ പേര്",
    registration_number: "രജിസ്ട്രേഷൻ നമ്പർ",
    confirm_password: "പാസ്‌വേഡ് ഉറപ്പാക്കുക",
    create_account: "രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുക",

    // Student Dashboard
    welcome_back: "സ്വാഗതം",
    available_exams: "ലഭ്യമായ പരീക്ഷകൾ",
    upcoming_exams: "വരാനിരിക്കുന്നവ",
    completed_exams: "പൂർത്തിയായവ",
    all_exams: "എല്ലാ പരീക്ഷകളും",
    start_exam: "പരീക്ഷ ആരംഭിക്കുക",
    start_reattempt: "വീണ്ടും ശ്രമിക്കുക",
    view_result: "സ്കോർകാർഡ് കാണുക",
    register_exam: "രജിസ്റ്റർ ചെയ്യുക",
    registered_badge: "രജിസ്റ്റർ ചെയ്തു",
    reattempt_ready: "വീണ്ടും എഴുതാൻ സജ്ജം",
    duration: "സമയപരിധി",
    questions: "ചോദ്യങ്ങൾ",
    total_marks: "ആകെ മാർക്ക്",
    minutes: "മിനിറ്റ്",

    // Exam Instructions
    instructions_title: "പരീക്ഷാ നിർദ്ദേശങ്ങളും ചട്ടങ്ങളും",
    accept_and_start: "അംഗീകരിച്ച് പരീക്ഷ ആരംഭിക്കുക",
    rule_1: "പരീക്ഷയിലുടനീളം സ്ഥിരമായ ഇന്റർനെറ്റ് കണക്ഷൻ ഉറപ്പാക്കുക.",
    rule_2: "വെബ്‌ക്യാം സദാ നിരീക്ഷണത്തിലാണ്. നിങ്ങളുടെ മുഖം കാണണം.",
    rule_3: "സ്‌ക്രീൻ വിട്ടുപോകുന്നതും ടാബ് മാറുന്നതും രേഖപ്പെടുത്തും.",
    rule_4: "അനുവദനീയമായ പരിധി കഴിഞ്ഞാൽ പരീക്ഷ തനിയെ സമർപ്പിക്കപ്പെടും.",
    confirm_instructions: "ഞാൻ നിയമങ്ങൾ വായിച്ചു മനസ്സിലാക്കി അംഗീകരിക്കുന്നു.",

    // Exam Attempt Workspace
    time_remaining: "ബാക്കി സമയം",
    synced_server: "സെർവറുമായി ബന്ധിപ്പിച്ചു",
    question: "ചോദ്യം",
    of: "ൽ",
    marks: "മാർക്ക്",
    negative_marking: "നെഗറ്റീവ് മാർക്കിംഗ്",
    multiple_choice: "ഒറ്റ തെരഞ്ഞെടുപ്പ് (MCQ)",
    multi_select: "വിവിധ തെരഞ്ഞെടുപ്പ്",
    short_answer: "ചെറു ഉത്തരങ്ങൾ",
    long_answer: "ലേഖന രൂപത്തിലുള്ള ഉത്തരങ്ങൾ",
    image_solution: "ചിത്രം / കൈയെഴുത്തു പ്രതികരണം",
    clear_response: "ഉത്തരം ഒഴിവാക്കുക",
    previous: "മുമ്പത്തെ",
    next: "അടുത്തത്",
    mark_review: "പിന്നീട് പരിശോധിക്കാൻ അടയാളപ്പെടുത്തുക",
    unmark_review: "ചിഹ്നം മാറ്റുക",
    review_and_submit: "പരിശോധിച്ച് സമർപ്പിക്കുക",
    submit_assessment: "പരീക്ഷ സമർപ്പിക്കുക",
    words: "വാക്കുകൾ",
    characters: "അക്ഷരങ്ങൾ",
    limit_exceeded: "പരിധി കവിഞ്ഞു",
    upload_image: "ചിത്രം അപ്‌ലോഡ് ചെയ്യുക",
    capture_camera: "ക്യാമറ വഴി പകർത്തുക",
    take_photo: "ഫോട്ടോ എടുക്കുക",
    retake_photo: "വീണ്ടും എടുക്കുക",
    use_photo: "ഈ ചിത്രം ഉപയോഗിക്കുക",
    open_camera: "ക്യാമറ തുറക്കുക",
    live_proctoring: "തത്സമയ നിരീക്ഷണം",
    monitoring_active: "നിരീക്ഷണം സജീവമാണ്",

    // Results & Scorecards
    scorecard_title: "ഔദ്യോഗിക പരീക്ഷാ സ്കോർകാർഡ്",
    total_score: "ആകെ സ്കോർ",
    percentage: "ശതമാനം",
    status_passed: "വിജയിച്ചു",
    status_failed: "മെച്ചപ്പെടുത്തൽ ആവശ്യമാണ്",
    download_pdf: "സാക്ഷ്യപ്പെടുത്തിയ PDF ഡൗൺലോഡ് ചെയ്യുക",
    question_breakdown: "ചോദ്യങ്ങൾ അടിസ്ഥാനമാക്കിയുള്ള വിശകലനം",
    examiner_feedback: "പരീക്ഷകന്റെ വിലയിരുത്തൽ",

    // Re-Attempt Messages
    attempt_completed_notice: "നിങ്ങളുടെ പരീക്ഷ പൂർത്തിയായി. ഇപ്പോൾ അധിക ശ്രമങ്ങൾ ലഭ്യമല്ല.",
    pending_admin_approval: "അഡ്മിൻ അംഗീകാരം കാത്തിരിക്കുന്നു",
    active_authorized: "അംഗീകരിച്ചു / സജീവം",
    rejected: "നിരസിച്ചു",
    revoked: "റദ്ദാക്കി",

    // Admin Console
    admin_console: "അഡ്മിൻ കൺട്രോൾ സെന്റർ",
    enrolled_students: "രജിസ്റ്റർ ചെയ്ത വിദ്യാർത്ഥികൾ",
    faculty_examiners: "പരീക്ഷകർ",
    active_sessions: "സജീവ പരീക്ഷകൾ",
    reattempt_approvals: "പുനഃപരിശീലന അനുമതികൾ",
    approve: "അംഗീകരിക്കുക",
    reject: "നിരസിക്കുക",
    revoke: "റദ്ദാക്കുക",
    grant_reattempt: "നേരിട്ട് അനുമതി നൽകുക",
    notifications: "അറിയിപ്പുകൾ",
    change_password: "പാസ്‌വേഡ് മാറ്റുക",
    reason: "കാരണം",
    submit_request: "അഭ്യർത്ഥന സമർപ്പിക്കുക",
    cancel: "റദ്ദാക്കുക",
    pending: "തീർപ്പുകൽപ്പിക്കാത്തത്",
    approved: "അംഗീകരിച്ചു",
  },

  kn: {
    // Nav & Common
    platform_title: "IntelliExamAI",
    home: "ಮುಖಪುಟ",
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    exams: "ಪರೀಕ್ಷೆಗಳು",
    question_bank: "ಪ್ರಶ್ನೆ ಕೋಶ",
    results: "ಫಲಿತಾಂಶಗಳು",
    candidates: "ಅಭ್ಯರ್ಥಿಗಳು",
    users: "ಬಳಕೆದಾರರು",
    analytics: "ವಿಶ್ಲೇಷಣೆ",
    profile: "ಪ್ರೊಫೈಲ್",
    login: "ಲಾಗಿನ್",
    register: "ನೋಂದಣಿ",
    logout: "ಲಾಗ್ ಔಟ್",
    language: "ಭಾಷೆ",

    // Roles
    student: "ವಿದ್ಯಾರ್ಥಿ",
    examiner: "ಪರೀಕ್ಷಕ",
    admin: "ನಿರ್ವಾಹಕ",

    // Auth
    sign_in_title: "IntelliExamAI ಪೋರ್ಟಲ್ ಪ್ರವೇಶ",
    sign_in_subtitle: "ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    student_login: "ವಿದ್ಯಾರ್ಥಿ ಲಾಗಿನ್",
    examiner_login: "ಪರೀಕ್ಷಕರ ಲಾಗಿನ್",
    admin_login: "ನಿರ್ವಾಹಕರ ಲಾಗಿನ್",
    email_address: "ಇಮೇಲ್ ವಿಳಾಸ",
    password: "ಪಾಸ್‌ವರ್ಡ್",
    forgot_password: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೀರಾ?",
    sign_in_button: "ಲಾಗಿನ್ ಮಾಡಿ",
    no_account: "ಹೊಸ ವಿದ್ಯಾರ್ಥಿಯೇ?",
    register_here: "ಇಲ್ಲಿ ನೋಂದಾಯಿಸಿ",
    student_registration_title: "ಅಭ್ಯರ್ಥಿ ನೋಂದಣಿ",
    student_registration_subtitle: "ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ",
    full_name: "ಪೂರ್ಣ ಹೆಸರು",
    registration_number: "ನೋಂದಣಿ ಸಂಖ್ಯೆ",
    confirm_password: "ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ",
    create_account: "ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಿ",

    // Student Dashboard
    welcome_back: "ಮರಳಿ ಸ್ವಾಗತ",
    available_exams: "ಲಭ್ಯವಿರುವ ಪರೀಕ್ಷೆಗಳು",
    upcoming_exams: "ಮುಂಬರುವ ಪರೀಕ್ಷೆಗಳು",
    completed_exams: "ಪೂರ್ಣಗೊಂಡ ಪರೀಕ್ಷೆಗಳು",
    all_exams: "ಎಲ್ಲಾ ಪರೀಕ್ಷೆಗಳು",
    start_exam: "ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    start_reattempt: "ಮರು ಪ್ರಯತ್ನ ಪ್ರಾರಂಭಿಸಿ",
    view_result: "ಅಂಕಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ",
    register_exam: "ನೋಂದಾಯಿಸಿ",
    registered_badge: "ನೋಂದಾಯಿಸಲಾಗಿದೆ",
    reattempt_ready: "ಮರು ಪ್ರಯತ್ನ ಸಿದ್ಧ",
    duration: "ಅವಧಿ",
    questions: "ಪ್ರಶ್ನೆಗಳು",
    total_marks: "ಒಟ್ಟು ಅಂಕಗಳು",
    minutes: "ನಿಮಿಷಗಳು",

    // Exam Instructions
    instructions_title: "ಪರೀಕ್ಷಾ ನಿಯಮಗಳು ಮತ್ತು ನಿಬಂಧನೆಗಳು",
    accept_and_start: "ಒಪ್ಪಿಕೊಂಡು ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    rule_1: "ಪರೀಕ್ಷೆಯ ಸಮಯದಲ್ಲಿ ಸ್ಥಿರ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವನ್ನು ಹೊಂದಿರಿ.",
    rule_2: "ವೆಬ್‌ಕ್ಯಾಮ್ ನಿರಂತರವಾಗಿ ಚಾಲನೆಯಲ್ಲಿರುತ್ತದೆ. ನಿಮ್ಮ ಮುಖ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣಿಸಬೇಕು.",
    rule_3: "ಸ್ಕ್ರೀನ್ ಬಿಟ್ಟು ಬೇರೆಡೆ ಹೋಗುವುದು ಅಥವಾ ಟ್ಯಾಬ್ ಬದಲಾಯಿಸುವುದು ದಾಖಲಾಗುತ್ತದೆ.",
    rule_4: "ಮಿತಿ ಮೀರಿದ ಎಚ್ಚರಿಕೆಗಳ ನಂತರ ಪರೀಕ್ಷೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಲ್ಲಿಕೆಯಾಗುತ್ತದೆ.",
    confirm_instructions: "ನಾನು ಎಲ್ಲಾ ನಿಯಮಗಳನ್ನು ಓದಿದ್ದೇನೆ ಮತ್ತು ಒಪ್ಪುತ್ತೇನೆ.",

    // Exam Attempt Workspace
    time_remaining: "ಉಳಿದಿರುವ ಸಮಯ",
    synced_server: "ಸರ್ವರ್‌ನೊಂದಿಗೆ ಸಿಂಕ್ ಆಗಿದೆ",
    question: "ಪ್ರಶ್ನೆ",
    of: "ರಲ್ಲಿ",
    marks: "ಅಂಕಗಳು",
    negative_marking: "ಋಣಾತ್ಮಕ ಅಂಕ",
    multiple_choice: "ಬಹು ಆಯ್ಕೆ (MCQ)",
    multi_select: "ಬಹು-ಆಯ್ಕೆ ಪ್ರಶ್ನೆ",
    short_answer: "ಸಣ್ಣ ಉತ್ತರ",
    long_answer: "ದೀರ್ಘ ಪ್ರಬಂಧ",
    image_solution: "ಚಿತ್ರ / ಕೈಬರಹದ ಪರಿಹಾರ",
    clear_response: "ಉತ್ತರ ತೆರವುಗೊಳಿಸಿ",
    previous: "ಹಿಂದಿನ",
    next: "ಮುಂದಿನ",
    mark_review: "ಮರುಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸಿ",
    unmark_review: "ಗುರುತು ತೆಗೆಯಿರಿ",
    review_and_submit: "ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ",
    submit_assessment: "ಪರೀಕ್ಷೆ ಸಲ್ಲಿಸಿ",
    words: "ಪದಗಳು",
    characters: "ಅಕ್ಷರಗಳು",
    limit_exceeded: "ಮಿತಿ ಮೀರಿದೆ",
    upload_image: "ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    capture_camera: "ಕ್ಯಾಮೆರಾದಿಂದ ಫೋಟೋ ತೆಗೆಯಿರಿ",
    take_photo: "ಫೋಟೋ ತೆಗೆ",
    retake_photo: "ಮತ್ತೆ ತೆಗೆ",
    use_photo: "ಈ ಫೋಟೋ ಬಳಸಿ",
    open_camera: "ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ",
    live_proctoring: "ಲೈವ್ ಕಣ್ಗಾವಲು",
    monitoring_active: "ಮೇಲ್ವಿಚಾರಣೆ ಸಕ್ರಿಯವಾಗಿದೆ",

    // Results & Scorecards
    scorecard_title: "ಅಧಿಕೃತ ಪರೀಕ್ಷಾ ಅಂಕಪಟ್ಟಿ",
    total_score: "ಒಟ್ಟು ಅಂಕಗಳು",
    percentage: "ಶೇಕಡಾವಾರು",
    status_passed: "ತೇರ್ಗಡೆ",
    status_failed: "ಸುಧಾರಣೆ ಅಗತ್ಯ",
    download_pdf: "ದೃಢೀಕೃತ PDF ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    question_breakdown: "ಪ್ರಶ್ನಾವಾರು ವಿಶ್ಲೇಷಣೆ",
    examiner_feedback: "ಪರೀಕ್ಷಕರ ಮೌಲ್ಯಮಾಪನ",

    // Re-Attempt Messages
    attempt_completed_notice: "ನಿಮ್ಮ ಪರೀಕ್ಷೆ ಪೂರ್ಣಗೊಂಡಿದೆ. ಪ್ರಸ್ತುತ ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ಪ್ರಯತ್ನ ಲಭ್ಯವಿಲ್ಲ.",
    pending_admin_approval: "ನಿರ್ವಾಹಕರ ಅನುಮೋದನೆ ಬಾಕಿ ಇದೆ",
    active_authorized: "ಅಧಿಕೃತ / ಸಕ್ರಿಯ",
    rejected: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",
    revoked: "ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ",

    // Admin Console
    admin_console: "ನಿರ್ವಾಹಕ ಕಮಾಂಡ್ ಸೆಂಟರ್",
    enrolled_students: "ನೋಂದಾಯಿತ ವಿದ್ಯಾರ್ಥಿಗಳು",
    faculty_examiners: "ಪರೀಕ್ಷಕ ಸಿಬ್ಬಂದಿ",
    active_sessions: "ಸಕ್ರಿಯ ಪರೀಕ್ಷಾ ಸೆಷನ್‌ಗಳು",
    reattempt_approvals: "ಮರು ಪ್ರಯತ್ನ ಅನುಮೋದನೆಗಳು",
    approve: "ಅನುಮೋದಿಸಿ",
    reject: "ತಿರಸ್ಕರಿಸಿ",
    revoke: "ರದ್ದುಮಾಡಿ",
    grant_reattempt: "ನೇರ ಮರು ಪ್ರಯತ್ನ ನೀಡಿ",
    notifications: "ಸೂಚನೆಗಳು",
    change_password: "ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ",
    reason: "ಕಾರಣ",
    submit_request: "ವಿನಂತಿಯನ್ನು ಸಲ್ಲಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    pending: "ಬಾಕಿ ಇದೆ",
    approved: "ಅನುಮೋದಿಸಲಾಗಿದೆ",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isHydrated: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
  isHydrated: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    try {
      const saved = localStorage.getItem("intelliexam_preferred_lang") as Language;
      if (saved && TRANSLATIONS[saved]) {
        setLanguageState(saved);
      }
    } catch (e) {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("intelliexam_preferred_lang", lang);
    } catch (e) {}
  };

  const t = (key: string): string => {
    // Both SSR and initial client render must strictly evaluate in English
    const effectiveLang = isHydrated ? language : "en";
    const langDict = TRANSLATIONS[effectiveLang];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    return TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isHydrated }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, isHydrated } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption =
    (isHydrated ? SUPPORTED_LANGUAGES.find((l) => l.code === language) : null) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#language-switcher-container")) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div id="language-switcher-container" className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#E06A26]/40"
        title="Change Platform Language"
      >
        <Globe className="h-3.5 w-3.5 text-[#E06A26]" />
        <span className="font-medium">{currentOption.nativeName}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-stone-200 shadow-xl py-1 z-50 animate-fade-in text-stone-800">
          <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
            Select Language (7 Languages)
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((opt) => (
              <button
                key={opt.code}
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-stone-50 transition-colors ${
                  language === opt.code ? "font-bold text-[#E06A26] bg-[#FEF3EC]" : "text-stone-700"
                }`}
              >
                <div>
                  <div className="text-xs">{opt.nativeName}</div>
                  <div className="text-[10px] text-stone-400 font-normal">{opt.name}</div>
                </div>
                {language === opt.code && <Check className="h-3.5 w-3.5 text-[#E06A26]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
