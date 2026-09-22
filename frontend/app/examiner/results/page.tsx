"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { Exam, ExamSubmissionResult } from "@/types";
import { Card, Button, Badge, Alert, StatCard } from "@/components/UIComponents";
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
        ? "PASSED"
        : res.passed
        ? "PASSED"
        : "FAILED"
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
  const passedSubmissions = results.filter((r) => r.passed).length;
  const passRate = totalSubmissions > 0 ? ((passedSubmissions / totalSubmissions) * 100).toFixed(1) : "0.0";
  const avgScore =
    totalSubmissions > 0
      ? (results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-1">
            <GraduationCap className="h-3.5 w-3.5" />
            Evaluation Analytics
          </div>
          <h1 className="text-2xl font-bold text-[#1C1C1F] tracking-tight">Candidate Examination Results</h1>
          <p className="text-xs text-[#6B6B76] mt-0.5">
            Review official student scorecards, subjective evaluations, and export candidate performance records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={!selectedExamId || results.length === 0}
            isLoading={isExportingCsv}
            className="text-xs py-2 border-[#EAE6DF] text-[#2B7853] hover:bg-[#2B7853]/10 font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-[#2B7853]" /> Export CSV Spreadsheet
          </Button>

          <Link href="/examiner">
            <Button variant="outline" className="text-xs py-2">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {errorMessage && <Alert type="error">{errorMessage}</Alert>}

      {/* Exam Selector & Stats */}
      <Card className="p-5 space-y-4 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 lg:w-1/2">
            <label className="text-xs font-bold text-[#C85332] uppercase tracking-wider">
              Select Examination Assessment
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] focus:ring-2 focus:ring-[#C85332] focus:outline-none bg-[#FAF8F5] font-semibold text-[#1C1C1F]"
            >
              {exams.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name} ({e.subject}) — {e.total_questions} Questions
                </option>
              ))}
            </select>
          </div>

          {currentExam && (
            <div className="flex items-center gap-3">
              <div className="bg-[#FAF8F5] px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-center min-w-[100px]">
                <span className="text-[10px] text-[#6B6B76] uppercase font-bold block">Total Tested</span>
                <span className="text-xl font-extrabold text-[#1C1C1F]">{totalSubmissions}</span>
              </div>
              <div className="bg-[#2B7853]/10 px-4 py-2.5 rounded-xl border border-[#2B7853]/20 text-center min-w-[100px]">
                <span className="text-[10px] text-[#2B7853] uppercase font-bold block">Pass Rate</span>
                <span className="text-xl font-extrabold text-[#2B7853]">{passRate}%</span>
              </div>
              <div className="bg-[#FEF3EC] px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-center min-w-[100px]">
                <span className="text-[10px] text-[#C85332] uppercase font-bold block">Avg Score</span>
                <span className="text-xl font-extrabold text-[#C85332]">{avgScore}%</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results Table */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C85332]"></div>
        </div>
      ) : results.length === 0 ? (
        <Card className="text-center py-16 space-y-3 bg-[#FFFFFF] border-[#EAE6DF]">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3EC] text-[#C85332] flex items-center justify-center mx-auto">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-base font-bold text-[#1C1C1F]">No Candidate Evaluations Yet</p>
          <p className="text-xs text-[#6B6B76] max-w-md mx-auto">
            Candidates registered for this examination will have their authoritative evaluated scorecards listed here once they complete or submit their sessions.
          </p>
        </Card>
      ) : (
        <div className="bg-[#FFFFFF] rounded-2xl shadow-sm border border-[#EAE6DF] overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-[#EAE6DF] flex items-center justify-between text-xs text-[#6B6B76]">
            <span>Showing <strong className="text-[#1C1C1F]">{results.length}</strong> candidate evaluations</span>
            <span>Subject: <strong className="text-[#C85332]">{currentExam?.subject}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5]/50 border-b border-[#EAE6DF] text-[11px] uppercase text-[#6B6B76] font-bold tracking-wider">
                  <th className="py-3.5 px-5">Candidate</th>
                  <th className="py-3.5 px-5">Registration #</th>
                  <th className="py-3.5 px-5">Score</th>
                  <th className="py-3.5 px-5">Percentage</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Submitted At</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {results.map((r) => (
                  <tr key={r.result_id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#1C1C1F]">{r.student_name}</td>
                    <td className="py-3.5 px-5 font-mono font-semibold text-xs text-[#C85332]">
                      {r.registration_number || "REG-UNASSIGNED"}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[#1C1C1F]">
                      {r.total_marks.toFixed(1)} / {r.maximum_marks.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-[#1C1C1F]">
                      {r.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={r.status === "UNDER_REVIEW" || r.result_status === "UNDER_REVIEW" ? "warning" : r.passed ? "success" : "danger"}>
                        {r.status === "UNDER_REVIEW" || r.result_status === "UNDER_REVIEW"
                          ? "UNDER REVIEW"
                          : r.passed ? "PASSED" : "FAILED"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#6B6B76]">
                      {new Date(r.submitted_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenReview(r)}
                          className="text-xs py-1 px-2.5 text-[#C85332] border-[#EAE6DF] hover:bg-[#FEF3EC]"
                        >
                          <Edit3 className="h-3 w-3 mr-1" /> Score & Review
                        </Button>
                        <Link href={`/student/results?result_id=${r.result_id}`}>
                          <Button variant="outline" className="text-xs py-1 px-2.5">
                            <Eye className="h-3 w-3 mr-1" /> Breakdown
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Subjective Evaluation & Examiner Scoring */}
      {reviewingResult && (
        <div className="fixed inset-0 z-50 bg-[#171719]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-[#FFFFFF] rounded-2xl p-6 space-y-4 shadow-2xl border border-[#EAE6DF]">
            <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] border border-[#EAE6DF] flex items-center justify-center text-[#C85332]">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C1C1F]">Examiner Evaluation & Subjective Scoring</h3>
                  <p className="text-xs text-[#6B6B76]">
                    Candidate: <strong className="text-[#1C1C1F]">{reviewingResult.student_name}</strong> ({reviewingResult.registration_number || "REG-UNASSIGNED"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingResult(null)}
                className="text-[#6B6B76] hover:text-[#1C1C1F] p-1.5 rounded-lg hover:bg-[#FAF8F5]"
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
                  <Card key={b.question_id} className="p-4 space-y-3 border-[#EAE6DF] bg-[#FFFFFF]">
                    <div className="flex items-start justify-between gap-2 border-b border-[#EAE6DF] pb-2.5">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
                          Question {idx + 1} • {b.question_type}
                        </span>
                        <p className="font-bold text-xs text-[#1C1C1F] leading-snug">
                          {b.question_text}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#6B6B76] shrink-0 bg-[#FAF8F5] px-2 py-1 rounded-md border border-[#EAE6DF]">
                        Max: {b.marks_possible} pts
                      </span>
                    </div>

                    {b.is_marked_for_review && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20">
                        ★ Flagged for Review during attempt
                      </div>
                    )}

                    {/* Reference Model Answer / Rubric */}
                    {b.model_answer && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE6DF] text-xs space-y-1">
                        <span className="font-bold text-[#A8A29E] flex items-center gap-1 text-[11px]">
                          <FileText className="h-3.5 w-3.5 text-[#D97706]" /> Reference Model Answer / Rubric:
                        </span>
                        <p className="text-[#1C1C1F] leading-relaxed whitespace-pre-wrap">{b.model_answer}</p>
                      </div>
                    )}

                    {/* Student Text Answer */}
                    {b.student_text_answer && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE6DF] text-xs space-y-1">
                        <span className="font-bold text-[#C85332] block text-[11px]">Candidate Text Submission:</span>
                        <p className="font-mono text-[#1C1C1F] whitespace-pre-wrap">{b.student_text_answer}</p>
                      </div>
                    )}

                    {/* Handwritten / Uploaded Image & Thumbnail */}
                    {(thumbUrl || fullImageUrl) && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE6DF] text-xs space-y-2">
                        <span className="font-bold text-[#C85332] flex items-center gap-1 text-[11px]">
                          <ImageIcon className="h-3.5 w-3.5 text-[#C85332]" /> Handwritten / Uploaded Sheet:
                        </span>
                        <div className="flex items-center gap-3">
                          {thumbUrl && (
                            <img
                              src={thumbUrl}
                              alt="Handwritten Answer Thumbnail (200x200)"
                              className="w-24 h-24 object-cover rounded-lg border border-[#EAE6DF] shadow-xs"
                            />
                          )}
                          {fullImageUrl && (
                            <a
                              href={fullImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE6DF] bg-white text-xs font-semibold text-[#C85332] hover:bg-[#FEF3EC] transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> View Full Original Image
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* OCR Scanned Extracted Text */}
                    {b.ocr_text && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE6DF] text-xs space-y-1">
                        <span className="font-bold text-[#2B7853] flex items-center gap-1 text-[11px]">
                          <FileText className="h-3.5 w-3.5" /> OCR Extracted Text:
                        </span>
                        <p className="font-mono text-[#1C1C1F] bg-white p-2 rounded-lg border border-[#EAE6DF] whitespace-pre-wrap">
                          {b.ocr_text}
                        </p>
                      </div>
                    )}

                    {/* AI Evaluation / Semantic Scoring Suggestion */}
                    {(suggestedMarks !== undefined || justification) && (
                      <div className="bg-gradient-to-r from-[#FEF3EC] to-[#FAF8F5] p-3.5 rounded-xl border border-[#D97706]/40 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#C85332] flex items-center gap-1 text-[11px]">
                            <Sparkles className="h-3.5 w-3.5 text-[#D97706]" /> AI Evaluation & Semantic Rubric Analysis:
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
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#C85332] text-white hover:bg-[#3B1D37] transition-colors flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Accept AI Score ({suggestedMarks} pts)
                            </button>
                          )}
                        </div>

                        {justification && (
                          <p className="text-[#1C1C1F] leading-relaxed text-[11px]">
                            {justification}
                          </p>
                        )}

                        {keyPointsMatched.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-[#2B7853]">Matched:</span>
                            {keyPointsMatched.map((kp: string, kIdx: number) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-md bg-[#2B7853]/10 text-[#2B7853] border border-[#2B7853]/20 text-[10px] font-medium"
                              >
                                ✓ {kp}
                              </span>
                            ))}
                          </div>
                        )}

                        {keyPointsMissed.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-[#C85332]">Missed:</span>
                            {keyPointsMissed.map((kp: string, kIdx: number) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-md bg-[#C85332]/10 text-[#C85332] border border-[#C85332]/20 text-[10px] font-medium"
                              >
                                ✗ {kp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Examiner Scoring & Feedback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#EAE6DF]">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-[#1C1C1F] shrink-0">Awarded Marks:</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={b.marks_possible}
                          value={reviewScores[b.question_id] ?? b.marks_awarded}
                          onChange={(e) =>
                            setReviewScores((prev) => ({
                              ...prev,
                              [b.question_id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-24 px-2.5 py-1 text-xs border rounded-lg border-[#EAE6DF] bg-[#FAF8F5] font-bold text-[#C85332] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
                        />
                        <span className="text-[11px] text-[#6B6B76]">/ {b.marks_possible} pts</span>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Optional evaluator feedback/remarks..."
                          value={reviewFeedback[b.question_id] || ""}
                          onChange={(e) =>
                            setReviewFeedback((prev) => ({
                              ...prev,
                              [b.question_id]: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1 text-xs border rounded-lg border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#1C1C1F]">Final Verdict Status:</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-xl border-[#EAE6DF] font-bold text-[#1C1C1F] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#C85332]"
                >
                  <option value="PASSED">PASSED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="UNDER_REVIEW">KEEP UNDER REVIEW</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setReviewingResult(null)} className="text-xs py-2 px-4">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveReview}
                  isLoading={isSavingReview}
                  className="text-xs py-2 px-5 gap-1.5 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" /> Save Evaluation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExaminerResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C85332]"></div>
        </div>
      }
    >
      <ExaminerResultsContent />
    </Suspense>
  );
}

