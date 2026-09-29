"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { getLocalizedQuestionText } from "@/lib/questionTranslations";
import { ExamSubmissionResult, QuestionResultBreakdown } from "@/types";
import { Card, Button, Badge, Alert, Modal, ProgressBar } from "@/components/UIComponents";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ArrowLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  HelpCircle,
  Percent,
  Calendar,
  User,
  Building,
  Target,
  TrendingDown,
  TrendingUp,
  BookOpen,
  GraduationCap,
  ImageIcon,
  ExternalLink,
  MessageSquareQuote
} from "lucide-react";

function StudentResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const resultIdParam = searchParams.get("result_id");
  const sessionIdParam = searchParams.get("session_id");
  const autoSubmittedParam = searchParams.get("auto_submitted");

  const [resultsList, setResultsList] = useState<ExamSubmissionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExamSubmissionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student Profile Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // Fetch profile for student registration verification
    api
      .get("/auth/me")
      .then((res) => setProfileData(res.data?.student_profile || res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        if (resultIdParam) {
          const res = await api.get<ExamSubmissionResult>(`/results/${resultIdParam}`);
          setSelectedResult(res.data);
        } else if (sessionIdParam) {
          const res = await api.get<ExamSubmissionResult>(`/results/by-session/${sessionIdParam}`);
          setSelectedResult(res.data);
        } else {
          const res = await api.get<ExamSubmissionResult[]>("/results/my-results");
          setResultsList(res.data);
        }
      } catch (err: any) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [resultIdParam, sessionIdParam]);

  // Download PDF handler
  const handleDownloadPdf = async (resultId: number, examName: string) => {
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/results/${resultId}/download/pdf?lang=${language}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Scorecard_${examName.replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF transcript: " + getErrorMessage(err));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Analyze Weak Subjects & Focus Areas from breakdown
  const computeFocusAreas = (breakdown: QuestionResultBreakdown[]) => {
    const typeMap: Record<string, { total: number; correct: number; marksPossible: number; marksAwarded: number }> = {};

    breakdown.forEach((q) => {
      const t = q.question_type || "MCQ";
      if (!typeMap[t]) {
        typeMap[t] = { total: 0, correct: 0, marksPossible: 0, marksAwarded: 0 };
      }
      typeMap[t].total += 1;
      typeMap[t].marksPossible += q.marks_possible;
      typeMap[t].marksAwarded += Math.max(0, q.marks_awarded);
      if (q.is_correct) {
        typeMap[t].correct += 1;
      }
    });

    const focusAreas = Object.entries(typeMap).map(([type, stats]) => {
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      const efficiency = stats.marksPossible > 0 ? (stats.marksAwarded / stats.marksPossible) * 100 : 0;
      const isWeak = accuracy < 60;
      return {
        type,
        total: stats.total,
        correct: stats.correct,
        accuracy,
        efficiency,
        isWeak,
      };
    });

    return focusAreas.sort((a, b) => a.accuracy - b.accuracy);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C5A04A]"></div>
        <p className="text-xs text-[#6B6861] font-medium">Retrieving Official Examination Records...</p>
      </div>
    );
  }

  // 1. Detailed Scorecard View for Single Result
  if (selectedResult) {
    const isPublished = selectedResult.is_published === true || selectedResult.evaluation_status === "PUBLISHED";
    const focusAreas = isPublished ? computeFocusAreas(selectedResult.breakdown || []) : [];
    const weakAreas = focusAreas.filter((f) => f.isWeak);
    const strongAreas = focusAreas.filter((f) => !f.isWeak);
    const isPassed =
      selectedResult.status === "PASSED"
        ? true
        : selectedResult.status === "FAILED"
        ? false
        : selectedResult.passed !== undefined
        ? selectedResult.passed
        : (selectedResult.percentage ?? 0) >= 50.0;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push("/student/results")}
            className="text-xs font-semibold text-[#6B6861] hover:text-[#181818] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#C5A04A]" /> {t("back_to_past_results")}
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
              className="gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-[#C5A04A]" /> {t("candidate_verification")}
            </Button>
            {isPublished ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownloadPdf(selectedResult.result_id, selectedResult.exam_name)}
                isLoading={isDownloadingPdf}
                className="gap-1.5 font-bold"
              >
                <Download className="h-3.5 w-3.5" /> {t("download_pdf_scorecard")}
              </Button>
            ) : (
              <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900/60 text-slate-400 border border-slate-800 cursor-not-allowed flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> {t("pdf_pending_publication")}
              </span>
            )}
          </div>
        </div>

        {/* Submission Status & Reason Banner */}
        <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{t("submission_status")}:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                  selectedResult.submission_status === "AUTO SUBMITTED" || autoSubmittedParam
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {selectedResult.submission_status || (autoSubmittedParam ? "AUTO SUBMITTED" : "SUBMITTED")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{t("submission_reason")}:</span>
              <span className="text-slate-200 font-medium">
                {selectedResult.submission_reason || (
                  autoSubmittedParam === "SUBMITTED_VIOLATION"
                    ? "Maximum allowed proctoring violations reached"
                    : autoSubmittedParam === "TIME_EXPIRED"
                    ? "Examination time expired"
                    : "Candidate manually confirmed submission"
                )}
              </span>
            </div>
          </div>
          <div className="text-slate-400 text-[11px] sm:text-right">
            {t("authoritative_timestamp")}:{" "}
            <span className="text-white font-mono font-bold">
              {new Date(selectedResult.submitted_at).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Hero Scorecard Banner */}
        <div className="bg-gradient-to-r from-[#0D1322] via-[#131B2E] to-[#0D1322] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-indigo-300">
                  {selectedResult.subject}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    !isPublished
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : isPassed
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/40"
                  }`}
                >
                  {!isPublished
                    ? (t("awaiting_valuation") || "AWAITING EVALUATION")
                    : isPassed
                    ? t("status_passed")
                    : t("status_failed")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {selectedResult.exam_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>
                  Candidate: <strong className="text-white">{selectedResult.student_name}</strong>
                </span>
                <span>&bull;</span>
                <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded border border-white/15 text-white">
                  Enrollment / Reg No: {selectedResult.registration_number || profileData?.enrollment_number || user?.registration_number || "REG-UNASSIGNED"}
                </span>
                <span>&bull;</span>
                <span>
                  Submitted: {new Date(selectedResult.submitted_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Score vs Valuation Status */}
            {isPublished ? (
              <div className="flex items-center gap-4 bg-white/10 p-5 rounded-2xl border border-white/20 backdrop-blur-xs">
                <div className="text-right">
                  <div className="text-[11px] uppercase font-bold text-slate-300">Total Score</div>
                  <div className="text-2xl font-black text-white font-mono">
                    {(selectedResult.total_marks ?? 0).toFixed(1)} / {(selectedResult.maximum_marks ?? 0).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400">authoritative marks</div>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-300 font-mono">
                    {(selectedResult.percentage ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-300">
                    Grade Outcome
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-white/10 p-5 rounded-2xl border border-white/20 backdrop-blur-xs">
                <div className="text-right">
                  <div className="text-[11px] uppercase font-bold text-slate-300">Evaluation Status</div>
                  <div className="text-base font-bold text-white flex items-center gap-1.5 justify-end mt-1">
                    <Clock className="w-4 h-4 text-amber-400" /> Awaiting Valuation
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Authoritative review in progress</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pre-publication Notice Card */}
        {!isPublished ? (
          <div className="p-8 rounded-2xl bg-[#0D1322] border border-slate-800 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Clock className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-white">
                Exam Submitted Successfully — Awaiting Evaluation
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your assessment submission has been securely recorded on the server. Subjective answers are undergoing formal valuation by your examiner.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your official score, pass/fail certification, detailed answer analysis, and certified PDF transcript will be unlocked here as soon as the result is officially declared and published.
              </p>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-slate-200 text-xs font-semibold border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Recorded Submission Time: {new Date(selectedResult.submitted_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Breakdown Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="p-4 text-center border-slate-800 bg-slate-900/80">
                <div className="text-[11px] uppercase text-slate-400 font-semibold">Total</div>
                <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                  {selectedResult.total_questions}
                </div>
                <div className="text-[10px] text-slate-400">Questions</div>
              </Card>

              <Card className="p-4 text-center border-emerald-500/30 bg-emerald-950/20">
                <div className="text-[11px] uppercase text-emerald-400 font-semibold">Correct</div>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                  {selectedResult.correct_answers}
                </div>
                <div className="text-[10px] text-emerald-400">Accurate</div>
              </Card>

              <Card className="p-4 text-center border-rose-500/30 bg-rose-950/20">
                <div className="text-[11px] uppercase text-rose-400 font-semibold">Incorrect</div>
                <div className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">
                  {selectedResult.incorrect_answers}
                </div>
                <div className="text-[10px] text-rose-400">Mistakes</div>
              </Card>

              <Card className="p-4 text-center border-slate-800 bg-slate-900/80">
                <div className="text-[11px] uppercase text-slate-400 font-semibold">Unanswered</div>
                <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                  {selectedResult.unanswered_questions}
                </div>
                <div className="text-[10px] text-slate-400">Skipped</div>
              </Card>

              <Card className="p-4 text-center border-amber-500/30 bg-amber-950/20">
                <div className="text-[11px] uppercase text-amber-400 font-semibold">Negative Ded.</div>
                <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                  -{selectedResult.negative_marks_deducted.toFixed(1)}
                </div>
                <div className="text-[10px] text-amber-400">Penalty applied</div>
              </Card>

              <Card className="p-4 text-center border-indigo-500/30 bg-indigo-950/20">
                <div className="text-[11px] uppercase text-indigo-300 font-semibold">Accuracy</div>
                <div className="text-2xl font-extrabold text-indigo-300 mt-1 font-mono">
                  {selectedResult.attempted_questions > 0
                    ? ((selectedResult.correct_answers / selectedResult.attempted_questions) * 100).toFixed(0)
                    : 0}
                  %
                </div>
                <div className="text-[10px] text-indigo-300">Of attempted</div>
              </Card>
            </div>

            {/* WEAK SUBJECTS & FOCUS AREAS SECTION */}
            <Card className="p-6 space-y-4 border-slate-800 bg-[#0D1322] shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Diagnostic Analysis: Weak Subjects & Focus Areas</h3>
                    <p className="text-xs text-slate-400">
                      Targeted performance diagnosis across question archetypes and cognitive skills.
                    </p>
                  </div>
                </div>
                <Badge variant={weakAreas.length > 0 ? "amber" : "emerald"}>
                  {weakAreas.length > 0 ? `${weakAreas.length} Focus Area(s)` : "High Mastery"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {focusAreas.map((item) => (
                  <div
                    key={item.type}
                    className={`p-4 rounded-xl border transition-all ${
                      item.isWeak
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.isWeak ? (
                          <TrendingDown className="h-4 w-4 text-amber-400" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        )}
                        <span className="font-bold text-xs text-white uppercase">{item.type}</span>
                      </div>
                      <span
                        className={`font-mono text-xs font-bold ${
                          item.isWeak ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {item.accuracy.toFixed(0)}% Accuracy
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <ProgressBar
                        value={item.accuracy}
                        max={100}
                        variant={item.isWeak ? "amber" : "emerald"}
                      />
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>
                          {item.correct} of {item.total} correct
                        </span>
                        <span>
                          {item.isWeak ? "Recommendation: Revise core concepts" : "Strong competency demonstrated"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {weakAreas.length > 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-amber-400" /> Recommended Action Plan:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Prioritize revision in <strong>{weakAreas.map((w) => w.type).join(", ")}</strong> modules. Review detailed answer keys below to understand scoring criteria and deduction patterns.
                  </p>
                </div>
              )}
            </Card>

            {/* Detailed Question Review List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Question-by-Question Assessment Review</h2>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedResult.breakdown.length} questions evaluated
                </span>
              </div>

          <div className="space-y-4">
            {selectedResult.breakdown.map((item: QuestionResultBreakdown, idx: number) => {
              let statusVariant: "emerald" | "slate" | "champagne" | "amber" | "rose" = "slate";
              let statusLabel = "Not Attempted";
              let statusBorder = "border-slate-800 bg-[#0D1322]";

              if (item.is_attempted) {
                if (item.is_correct) {
                  statusVariant = "emerald";
                  statusLabel = "Correct";
                  statusBorder = "border-emerald-500/30 bg-[#0D1322]";
                } else {
                  statusVariant = "rose";
                  statusLabel = "Incorrect";
                  statusBorder = "border-rose-500/30 bg-[#0D1322]";
                }
              }

              return (
                <Card key={item.question_id} className={`p-5 space-y-3 ${statusBorder}`}>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-lg bg-indigo-500/15 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {item.question_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                      <span className="text-xs font-bold text-white font-mono">
                        Score: {item.marks_awarded > 0 ? `+${item.marks_awarded}` : item.marks_awarded} /{" "}
                        {item.marks_possible} pts
                      </span>
                      {item.negative_marks_deducted > 0 && (
                        <span className="text-xs text-rose-400 font-semibold font-mono">
                          (-{item.negative_marks_deducted} neg)
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-white leading-relaxed">
                    {getLocalizedQuestionText(item, language)}
                  </p>

                  {item.is_marked_for_review && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      <span>★ Flagged for Review during attempt</span>
                    </div>
                  )}

                  {/* Candidate Text Response */}
                  {item.student_text_answer && (
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-slate-400">Candidate Text Response:</span>
                      <p className="text-slate-200 font-mono whitespace-pre-wrap">{item.student_text_answer}</p>
                    </div>
                  )}

                  {/* Handwritten / Uploaded Answer Image */}
                  {(item.thumbnail_path || item.image_path) && (() => {
                    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
                    const thumbUrl = item.thumbnail_path
                      ? `${apiBase}/${item.thumbnail_path.replace(/\\/g, "/")}`
                      : null;
                    const fullImageUrl = item.image_path
                      ? `${apiBase}/${item.image_path.replace(/\\/g, "/")}`
                      : null;
                    return (
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-400" /> Uploaded Handwritten Answer Sheet:
                        </span>
                        <div className="flex items-center gap-3">
                          {thumbUrl && (
                            <img
                              src={thumbUrl}
                              alt="Handwritten Answer Thumbnail (200x200)"
                              className="w-20 h-20 object-cover rounded-lg border border-slate-700 shadow-sm"
                            />
                          )}
                          {fullImageUrl && (
                            <a
                              href={fullImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-indigo-300 hover:bg-slate-700 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" /> View Full Original Upload
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* OCR Extracted Text */}
                  {item.ocr_text && (
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> OCR Digitized Text:
                      </span>
                      <p className="text-slate-200 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap">
                        {item.ocr_text}
                      </p>
                    </div>
                  )}

                  {/* Reference Model Answer / Explanation */}
                  {(item.model_answer || item.explanation) && (
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Reference Answer & Rubric Key:
                      </span>
                      <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {item.model_answer || item.explanation}
                      </p>
                    </div>
                  )}

                  {/* Evaluator Feedback */}
                  {item.evaluator_feedback && (
                    <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-xs space-y-1">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <MessageSquareQuote className="h-3.5 w-3.5 text-amber-400" /> Examiner Feedback & Notes:
                      </span>
                      <p className="text-slate-200 leading-relaxed italic">
                        "{item.evaluator_feedback}"
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
        </>
        )}

        {/* Candidate Profile Verification Modal */}
        <Modal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title="Official Candidate Identity Record"
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-400">Candidate Name:</span>
                <p className="font-bold text-sm text-white">{selectedResult.student_name}</p>
              </div>
              <Badge variant="emerald">Verified Student</Badge>
            </div>

            <div className="space-y-2 divide-y divide-slate-800">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Platform Reg No:</span>
                <span className="font-mono font-bold text-indigo-400">
                  {selectedResult.registration_number || user?.registration_number || "REG-PENDING"}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Enrollment Number:</span>
                <span className="font-mono font-bold text-white">
                  {profileData?.enrollment_number || "N/A"}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">College / Institute:</span>
                <span className="font-semibold text-white text-right">
                  {profileData?.college || "N/A"}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Course / Specialization:</span>
                <span className="font-semibold text-white">
                  {profileData?.course || "N/A"} {profileData?.specialization ? `(${profileData.specialization})` : ""}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Exam Subject:</span>
                <span className="font-semibold text-white">{selectedResult.subject}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // 2. Overview / List View of All Past Results
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{t("results")}</h1>
            <Badge variant="emerald">{t("student")}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("student_results_hero_desc")}
          </p>
        </div>
        <Link href="/student">
          <Button variant="outline" size="sm" className="gap-1.5 border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="h-3.5 w-3.5 text-indigo-400" /> {t("back_to_dashboard")}
          </Button>
        </Link>
      </div>

      {errorMessage && <Alert type="error">{errorMessage}</Alert>}

      {resultsList.length === 0 ? (
        <Card className="text-center py-16 space-y-4 border-dashed border-slate-800 bg-[#0D1322]">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl w-fit mx-auto border border-indigo-500/20">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-white">{t("no_completed_exams_desc")}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t("no_completed_exams_detail")}
          </p>
          <div className="pt-2">
            <Link href="/student">
              <Button variant="primary" size="sm">
                {t("available_exams")}
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {resultsList.map((res) => (
            <Card key={res.result_id} className="p-6 space-y-4 hover:border-indigo-500/40 transition-all border-slate-800 bg-[#0D1322] shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    {res.subject}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{res.exam_name}</h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    {new Date(res.submitted_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="text-right">
                  {res.is_published === true || res.evaluation_status === "PUBLISHED" ? (
                    <>
                      {(() => {
                        const isResPassed =
                          res.status === "PASSED"
                            ? true
                            : res.status === "FAILED"
                            ? false
                            : res.passed !== undefined
                            ? res.passed
                            : (res.percentage ?? 0) >= 50.0;
                        const isUnderReview =
                          res.status === "UNDER_REVIEW" || res.result_status === "UNDER_REVIEW";

                        return (
                          <>
                            <span
                              className={`text-2xl font-black font-mono ${
                                isUnderReview
                                  ? "text-amber-400"
                                  : isResPassed
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {(res.percentage ?? 0).toFixed(1)}%
                            </span>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              {isUnderReview
                                ? t("status_under_review")
                                : isResPassed
                                ? t("status_passed")
                                : t("status_failed")}
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-bold font-mono text-amber-400">-- / --</span>
                      <div className="text-[10px] font-bold text-amber-400 uppercase">{t("awaiting_valuation")}</div>
                    </>
                  )}
                </div>
              </div>

              {res.is_published === true || res.evaluation_status === "PUBLISHED" ? (
                <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-xl text-center text-xs border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">Score</span>
                    <span className="font-bold text-white font-mono">
                      {(res.total_marks ?? 0).toFixed(1)} / {(res.maximum_marks ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">Correct</span>
                    <span className="font-bold text-emerald-400 font-mono">{res.correct_answers ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">Accuracy</span>
                    <span className="font-bold text-indigo-300 font-mono">
                      {(res.attempted_questions || 0) > 0
                        ? (((res.correct_answers || 0) / res.attempted_questions) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/80 p-3 rounded-xl text-center text-xs border border-slate-800 text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{t("evaluation_in_progress_student_note")}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                {res.is_published === true || res.evaluation_status === "PUBLISHED" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(res.result_id, res.exam_name)}
                    className="w-1/2 text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-indigo-400" /> {t("download_pdf_scorecard")}
                  </Button>
                ) : (
                  <button
                    disabled
                    className="w-1/2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed text-center"
                    title={t("pdf_pending_publication")}
                  >
                    {t("pdf_pending_publication")}
                  </button>
                )}
                <Link href={`/student/results?result_id=${res.result_id}`} className="w-1/2">
                  <Button variant="primary" size="sm" className="w-full text-xs font-bold">
                    {res.is_published === true || res.evaluation_status === "PUBLISHED" ? t("view_result") : t("view_details")} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      }
    >
      <StudentResultsContent />
    </Suspense>
  );
}
