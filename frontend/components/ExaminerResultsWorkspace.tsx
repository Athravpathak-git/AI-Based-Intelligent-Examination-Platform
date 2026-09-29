"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Exam, ExamSubmissionResult } from "@/types";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import {
  Award,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Users,
  Eye,
  TrendingUp,
  Edit3,
  Save,
  X,
  GraduationCap,
  Sparkles,
  ImageIcon,
  FileText,
  Check,
  ExternalLink
} from "lucide-react";

function ExaminerResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const examIdParam = searchParams.get("exam_id");

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(examIdParam || "");
  const [results, setResults] = useState<ExamSubmissionResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subjective Review Modal State
  const [reviewingResult, setReviewingResult] = useState<ExamSubmissionResult | null>(null);
  const [reviewScores, setReviewScores] = useState<Record<number, number>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<number, string>>({});
  const [reviewStatus, setReviewStatus] = useState<string>("PASSED");
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // 1. Fetch configured exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get<Exam[]>("/exams");
        setExams(res.data);
        if (!selectedExamId && res.data.length > 0) {
          setSelectedExamId(String(res.data[0].id));
        }
      } catch (err) {
        console.error("Failed to load exams:", err);
      }
    };
    fetchExams();
  }, []);

  // 2. Fetch results for selected exam
  useEffect(() => {
    if (!selectedExamId) return;

    const fetchResults = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await api.get<ExamSubmissionResult[]>(`/results/exam/${selectedExamId}`);
        setResults(res.data);
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [selectedExamId]);

  // 3. Export CSV handler
  const handleExportCsv = async () => {
    if (!selectedExamId) return;
    setIsExportingCsv(true);
    try {
      const res = await api.get(`/results/exam/${selectedExamId}/export/csv`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `exam_${selectedExamId}_candidate_results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export results: " + getErrorMessage(err));
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleOpenReview = (res: ExamSubmissionResult) => {
    setReviewingResult(res);
    const initialScores: Record<number, number> = {};
    const initialFeedback: Record<number, string> = {};
    (res.breakdown || []).forEach((b) => {
      initialScores[b.question_id] = b.marks_awarded || 0;
      if (b.evaluator_feedback) {
        initialFeedback[b.question_id] = b.evaluator_feedback;
      }
    });
    setReviewScores(initialScores);
    setReviewFeedback(initialFeedback);
    setReviewStatus(
      res.status === "UNDER_REVIEW" || res.result_status === "UNDER_REVIEW"
        ? (res.passed ? "PASSED" : "FAILED")
        : (res.status === "PASSED" || res.status === "FAILED")
        ? res.status
        : (res.passed ? "PASSED" : "FAILED")
    );
  };

  const handleSaveReview = async () => {
    if (!reviewingResult) return;
    setIsSavingReview(true);
    try {
      const questionReviews = Object.entries(reviewScores).map(([qId, marks]) => ({
        question_id: Number(qId),
        marks_awarded: Number(marks),
        feedback: reviewFeedback[Number(qId)] || null,
      }));

      await api.put(`/results/${reviewingResult.result_id}/review`, {
        question_reviews: questionReviews,
        status: reviewStatus,
      });

      // Refresh results
      const res = await api.get<ExamSubmissionResult[]>(`/results/exam/${selectedExamId}`);
      setResults(res.data);
      setReviewingResult(null);
    } catch (err) {
      alert("Failed to save review: " + getErrorMessage(err));
    } finally {
      setIsSavingReview(false);
    }
  };

  const currentExam = exams.find((e) => String(e.id) === selectedExamId);

  // Summary stats
  const totalSubmissions = results.length;
  const passedSubmissions = results.filter(
    (r) => r.status === "PASSED" || (r.status !== "FAILED" && r.passed)
  ).length;
  const passRate = totalSubmissions > 0 ? ((passedSubmissions / totalSubmissions) * 100).toFixed(1) : "0.0";
  const avgScore =
    totalSubmissions > 0
      ? (results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{t("evaluation_analytics_title")}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t("candidate_exam_results_title")}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("candidate_results_desc")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={!selectedExamId || results.length === 0}
            isLoading={isExportingCsv}
            className="text-xs py-2 border-slate-800 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-400" /> {t("export_csv_spreadsheet")}
          </Button>

          <Link href="/examiner">
            <Button variant="outline" className="text-xs py-2 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {t("dashboard")}
            </Button>
          </Link>
        </div>
      </div>

      {errorMessage && <Alert type="error">{errorMessage}</Alert>}

      {/* Exam Selector & Stats */}
      <Card className="p-5 space-y-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 lg:w-1/2">
            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {t("select_examination_assessment")}
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-[#080C14] font-semibold text-white"
            >
              {exams.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name} ({e.subject}) — {e.total_questions} {t("questions")}
                </option>
              ))}
            </select>
          </div>

          {currentExam && (
            <div className="flex items-center gap-3">
              <div className="bg-[#080C14] px-4 py-2.5 rounded-xl border border-slate-800 text-center min-w-[100px]">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t("total_tested")}</span>
                <span className="text-xl font-extrabold text-white font-mono">{totalSubmissions}</span>
              </div>
              <div className="bg-emerald-500/5 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-center min-w-[100px]">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">{t("pass_rate")}</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">{passRate}%</span>
              </div>
              <div className="bg-[#080C14] px-4 py-2.5 rounded-xl border border-slate-800 text-center min-w-[100px]">
                <span className="text-[10px] text-indigo-400 uppercase font-bold block">{t("avg_score")}</span>
                <span className="text-xl font-extrabold text-indigo-400 font-mono">{avgScore}%</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results Table */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : results.length === 0 ? (
        <Card className="text-center py-16 space-y-3 bg-[#0D1322]/50 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Award className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">{t("no_results_desc")}</p>
          <p className="text-xs text-slate-400">No submissions recorded for this assessment yet.</p>
        </Card>
      ) : (
        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#080C14]/80 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                  <th className="py-3 px-5">{t("candidate_header")}</th>
                  <th className="py-3 px-5">{t("attempt_label")}</th>
                  <th className="py-3 px-5">{t("score")}</th>
                  <th className="py-3 px-5">{t("percentage")}</th>
                  <th className="py-3 px-5">{t("status_header")}</th>
                  <th className="py-3 px-5">{t("completed_stat")}</th>
                  <th className="py-3 px-5 text-right">{t("action_header")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {results.map((res) => {
                  const isPass = res.status === "PASSED" || (res.status !== "FAILED" && res.passed);
                  const isUnderReview = res.status === "UNDER_REVIEW" || res.result_status === "UNDER_REVIEW";

                  return (
                    <tr key={res.result_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-white">
                        <div className="font-bold text-slate-100">{res.student_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {res.registration_number || `ID #${res.student_id}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-300 font-mono">
                        Attempt #{res.attempt_number || 1}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-white font-mono">
                        {(res.score ?? res.total_marks ?? 0).toFixed(1)} / {res.maximum_marks}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-indigo-400 font-mono">
                        {res.percentage.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-5">
                        {isUnderReview ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {t("status_under_review")}
                          </span>
                        ) : isPass ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {t("status_passed")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {t("status_failed")}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                        {new Date(res.completed_at || res.submitted_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(res)}
                          className="text-xs py-1 px-3 border-slate-800 text-indigo-300 hover:text-white hover:bg-slate-800/60"
                        >
                          <Edit3 className="h-3 w-3 mr-1 text-indigo-400" /> {t("review_scoring_btn")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scoring / Review Modal */}
      {reviewingResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0D1322] rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t("examiner_scoring_modal_title")}</h3>
                  <p className="text-xs text-slate-400">
                    {t("candidate_header")}: <strong className="text-slate-200">{reviewingResult.student_name}</strong> ({reviewingResult.registration_number || "REG-UNASSIGNED"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingResult(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3.5 pr-1">
              {(reviewingResult.breakdown || []).map((b, idx) => {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
                const thumbUrl = b.thumbnail_path
                  ? `${apiBase}/${b.thumbnail_path.replace(/\\/g, "/")}`
                  : null;
                const fullImageUrl = b.image_path
                  ? `${apiBase}/${b.image_path.replace(/\\/g, "/")}`
                  : null;
                const aiEval = b.ai_evaluation;
                const suggestedMarks = b.ai_suggested_marks ?? aiEval?.suggested_marks;
                const justification = b.ai_justification ?? aiEval?.justification;
                const keyPointsMatched = aiEval?.matched_key_points || [];
                const keyPointsMissed = aiEval?.missed_key_points || [];

                return (
                  <Card key={b.question_id} className="p-4 space-y-3 border-slate-800 bg-[#080C14]/50">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t("question")} {idx + 1} • {b.question_type}
                        </span>
                        <p className="font-bold text-xs text-white leading-snug">
                          {b.question_text}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-indigo-400 shrink-0 bg-[#0D1322] px-2 py-1 rounded-md border border-slate-800">
                        {t("max_pts")}: {b.marks_possible} pts
                      </span>
                    </div>

                    {b.is_marked_for_review && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {t("flagged_for_review_badge")}
                      </div>
                    )}

                    {/* Reference Model Answer / Rubric */}
                    {b.model_answer && (
                      <div className="bg-[#0D1322] p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <span className="font-bold text-slate-400 flex items-center gap-1 text-[11px]">
                          <FileText className="h-3.5 w-3.5 text-indigo-400" /> {t("reference_model_answer_rubric")}
                        </span>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{b.model_answer}</p>
                      </div>
                    )}

                    {/* Student Text Answer */}
                    {b.student_text_answer && (
                      <div className="bg-[#0D1322] p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <span className="font-bold text-cyan-400 block text-[11px]">{t("candidate_text_submission")}</span>
                        <p className="font-mono text-slate-200 whitespace-pre-wrap">{b.student_text_answer}</p>
                      </div>
                    )}

                    {/* Handwritten / Uploaded Image & Thumbnail */}
                    {(thumbUrl || fullImageUrl) && (
                      <div className="bg-[#0D1322] p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                        <span className="font-bold text-indigo-400 flex items-center gap-1 text-[11px]">
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-400" /> {t("handwritten_uploaded_sheet")}
                        </span>
                        <div className="flex items-center gap-3">
                          {thumbUrl && (
                            <img
                              src={thumbUrl}
                              alt="Handwritten Answer Thumbnail (200x200)"
                              className="w-24 h-24 object-cover rounded-lg border border-slate-800 shadow-sm"
                            />
                          )}
                          {fullImageUrl && (
                            <a
                              href={fullImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-[#080C14] text-xs font-semibold text-indigo-300 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> {t("view_full_original_image")}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* OCR Scanned Extracted Text */}
                    {b.ocr_text && (
                      <div className="bg-[#0D1322] p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                          <FileText className="h-3.5 w-3.5" /> {t("ocr_extracted_text")}
                        </span>
                        <p className="font-mono text-slate-200 bg-[#080C14] p-2 rounded-lg border border-slate-800 whitespace-pre-wrap">
                          {b.ocr_text}
                        </p>
                      </div>
                    )}

                    {/* AI Evaluation / Semantic Scoring Suggestion */}
                    {(suggestedMarks !== undefined || justification) && (
                      <div className="bg-[#0D1322] p-3.5 rounded-xl border border-indigo-500/30 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-indigo-400 flex items-center gap-1 text-[11px]">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> {t("ai_recommended_evaluation")}
                          </span>
                          {suggestedMarks !== undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                setReviewScores((prev) => ({
                                  ...prev,
                                  [b.question_id]: Number(suggestedMarks),
                                }))
                              }
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <Check className="h-3 w-3" /> {t("accept_ai_score")} ({suggestedMarks} pts)
                            </button>
                          )}
                        </div>

                        {justification && (
                          <p className="text-slate-300 leading-relaxed text-[11px]">
                            {justification}
                          </p>
                        )}

                        {keyPointsMatched.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-emerald-400">{t("matched_label")}</span>
                            {keyPointsMatched.map((kp: string, kIdx: number) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium"
                              >
                                {kp}
                              </span>
                            ))}
                          </div>
                        )}

                        {keyPointsMissed.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-rose-400">{t("missed_label")}</span>
                            {keyPointsMissed.map((kp: string, kIdx: number) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium"
                              >
                                {kp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Authoritative Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          {t("marks_awarded_label")} (0 - {b.marks_possible})
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={b.marks_possible}
                          value={reviewScores[b.question_id] ?? 0}
                          onChange={(e) =>
                            setReviewScores((prev) => ({
                              ...prev,
                              [b.question_id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-1.5 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          {t("evaluator_feedback_label")}
                        </label>
                        <input
                          type="text"
                          value={reviewFeedback[b.question_id] || ""}
                          onChange={(e) =>
                            setReviewFeedback((prev) => ({
                              ...prev,
                              [b.question_id]: e.target.value,
                            }))
                          }
                          placeholder={t("feedback_placeholder")}
                          className="w-full px-3 py-1.5 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Verdict Override & Save */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-300">{t("final_verdict_status")}:</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-xl border-slate-800 font-bold text-white bg-[#080C14] focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="PASSED">{t("status_passed")}</option>
                  <option value="FAILED">{t("status_failed")}</option>
                  <option value="UNDER_REVIEW">{t("status_under_review")}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewingResult(null)}
                  className="text-xs py-2 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveReview}
                  isLoading={isSavingReview}
                  className="text-xs py-2 gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  <Save className="h-3.5 w-3.5" /> {t("save_authoritative_review")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExaminerResultsWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      }
    >
      <ExaminerResultsContent />
    </Suspense>
  );
}
