"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { PendingEvaluationItem, EvaluationSessionDetailResponse, QuestionResultBreakdown } from "@/types";
import { Card, Button, Badge } from "@/components/UIComponents";
import {
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Eye,
  Check,
  Maximize2,
  X,
  Send,
  Save,
  BookOpen,
  Layers,
  FileSpreadsheet
} from "lucide-react";

export default function ExaminerEvaluationsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Queue state
  const [items, setItems] = useState<PendingEvaluationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Active workspace state
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<EvaluationSessionDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);

  // Authoritative grading state for active question
  const [marksInput, setMarksInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [isSavingGrade, setIsSavingGrade] = useState<boolean>(false);

  // Finalize / Publish state
  const [overallRemarks, setOverallRemarks] = useState<string>("");
  const [evalStatusOverride, setEvalStatusOverride] = useState<string>("PASSED");
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Image Zoom Modal state
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // 1. Fetch pending evaluations queue
  const fetchQueue = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<PendingEvaluationItem[]>("/evaluations/pending");
      setItems(res.data);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // 2. Fetch session detail when a session is selected
  const openValuationWorkspace = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setIsLoadingDetail(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.get<EvaluationSessionDetailResponse>(`/evaluations/session/${sessionId}`);
      setSessionDetail(res.data);
      setOverallRemarks(res.data.evaluator_remarks || "");
      const isPassCalc = (res.data.maximum_marks > 0 ? (res.data.current_total_marks / res.data.maximum_marks) : 0) >= 0.5;
      setEvalStatusOverride(
        res.data.status === "PASSED" || res.data.status === "FAILED"
          ? res.data.status
          : isPassCalc ? "PASSED" : "FAILED"
      );
      setActiveQuestionIdx(0);
      loadQuestionGradingState(res.data.questions[0]);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setSelectedSessionId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const loadQuestionGradingState = (q?: QuestionResultBreakdown) => {
    if (!q) {
      setMarksInput("");
      setFeedbackInput("");
      return;
    }
    setMarksInput(q.marks_awarded !== undefined && q.marks_awarded !== null ? String(q.marks_awarded) : "");
    setFeedbackInput(q.evaluator_feedback || "");
  };

  const selectQuestion = (idx: number) => {
    if (!sessionDetail || !sessionDetail.questions[idx]) return;
    setActiveQuestionIdx(idx);
    loadQuestionGradingState(sessionDetail.questions[idx]);
  };

  // 3. Save Question Valuation
  const handleSaveQuestionGrade = async () => {
    if (!sessionDetail || !selectedSessionId) return;
    const activeQ = sessionDetail.questions[activeQuestionIdx];
    if (!activeQ) return;

    const parsedMarks = parseFloat(marksInput);
    if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > activeQ.marks_possible) {
      setErrorMessage(`${t("enter_valid_marks_between")} ${activeQ.marks_possible}.`);
      return;
    }

    setIsSavingGrade(true);
    setErrorMessage(null);
    try {
      await api.post(`/evaluations/session/${selectedSessionId}/grade-question`, {
        question_id: activeQ.question_id,
        marks_awarded: parsedMarks,
        evaluator_feedback: feedbackInput.trim() || null,
      });

      // Reload session detail to reflect updated total marks & progress
      const res = await api.get<EvaluationSessionDetailResponse>(`/evaluations/session/${selectedSessionId}`);
      setSessionDetail(res.data);
      setSuccessMessage(`${t("question")} #${activeQuestionIdx + 1} ${t("valuation_saved_msg")}`);

      // Auto-advance to next question if not at end
      if (activeQuestionIdx < res.data.questions.length - 1) {
        const nextIdx = activeQuestionIdx + 1;
        setActiveQuestionIdx(nextIdx);
        loadQuestionGradingState(res.data.questions[nextIdx]);
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsSavingGrade(false);
    }
  };

  // 4. Accept AI Recommendation
  const handleApplyAiMarks = () => {
    if (!sessionDetail) return;
    const activeQ = sessionDetail.questions[activeQuestionIdx];
    if (!activeQ) return;
    const suggested = activeQ.ai_suggested_marks ?? activeQ.ai_evaluation?.suggested_marks;
    if (suggested !== undefined && suggested !== null) {
      setMarksInput(String(suggested));
      if (!feedbackInput && (activeQ.ai_justification || activeQ.ai_evaluation?.justification)) {
        setFeedbackInput(activeQ.ai_justification || activeQ.ai_evaluation?.justification || "");
      }
    }
  };

  // 5. Finalize Evaluation
  const handleFinalize = async () => {
    if (!sessionDetail || !selectedSessionId) return;
    setIsFinalizing(true);
    setErrorMessage(null);
    try {
      await api.post(`/evaluations/session/${selectedSessionId}/finalize`, {
        evaluator_remarks: overallRemarks.trim() || null,
        status: evalStatusOverride,
      });
      const res = await api.get<EvaluationSessionDetailResponse>(`/evaluations/session/${selectedSessionId}`);
      setSessionDetail(res.data);
      setSuccessMessage(t("valuation_finalized_ready_notice"));
      fetchQueue();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsFinalizing(false);
    }
  };

  // 6. Publish Final Result
  const handlePublish = async () => {
    if (!sessionDetail || !selectedSessionId) return;
    if (!confirm(t("confirm_publish_prompt"))) return;

    setIsPublishing(true);
    setErrorMessage(null);
    try {
      await api.post(`/evaluations/session/${selectedSessionId}/publish`, {
        status: evalStatusOverride,
      });
      setSuccessMessage(t("result_officially_published_notice"));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
      setTimeout(() => {
        setSelectedSessionId(null);
        setSessionDetail(null);
        fetchQueue();
      }, 1500);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  // Filtered queue items
  const filteredItems = items.filter((item) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      item.evaluation_status === statusFilter ||
      (statusFilter === "READY_FOR_PUBLICATION" && item.evaluation_status === "READY_FOR_PUBLICATION");

    const matchesSearch =
      !searchQuery.trim() ||
      item.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.registration_number && item.registration_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.exam_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const currentQ = sessionDetail ? sessionDetail.questions[activeQuestionIdx] : null;

  // Queue Counters
  const awaitingCount = items.filter((i) => i.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION").length;
  const inProgress = items.filter((i) => i.evaluation_status === "EVALUATION_IN_PROGRESS").length;
  const readyPublish = items.filter((i) => i.evaluation_status === "READY_FOR_PUBLICATION").length;
  const published = items.filter((i) => i.evaluation_status === "PUBLISHED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t("valuation_workspace_title")}
            </h1>
            <Badge variant="indigo">{t("valuation_grading")}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("authoritative_valuation_desc")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/examiner">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
              <ArrowLeft className="w-3.5 h-3.5" /> {t("back_to_dashboard")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div>
        {/* Metric Badges Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("awaiting_valuation")}</div>
                <div className="text-2xl font-black text-rose-400 mt-1 font-mono">{awaitingCount}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("in_progress")}</div>
                <div className="text-2xl font-black text-amber-400 mt-1 font-mono">{inProgress}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("ready_to_publish")}</div>
                <div className="text-2xl font-black text-indigo-400 mt-1 font-mono">{readyPublish}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("published")}</div>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{published}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Valuation Queue Section */}
        {!selectedSessionId && (
          <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">{t("candidate_submissions_queue")}</h2>
                <p className="text-xs text-slate-400">{t("submissions_queue_desc")}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("search_candidate_or_exam")}
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-[#080C14] text-white placeholder-slate-500 focus:bg-[#0D1322] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-48 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  {[
                    { id: "ALL", label: t("all_submissions") },
                    { id: "AWAITING_SUBJECTIVE_EVALUATION", label: t("awaiting_valuation") },
                    { id: "EVALUATION_IN_PROGRESS", label: t("in_progress") },
                    { id: "READY_FOR_PUBLICATION", label: t("ready_to_publish") },
                    { id: "PUBLISHED", label: t("published") }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === tab.id ? "bg-indigo-600 text-white shadow-sm font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Queue Table */}
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                {t("loading_evaluation_queue")}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                {t("no_submissions_matching_filter")}
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">{t("candidate_header")}</th>
                      <th className="py-3 px-4">{t("exam_and_subject")}</th>
                      <th className="py-3 px-4">{t("attempt_label")} #</th>
                      <th className="py-3 px-4">{t("submitted_at_header")}</th>
                      <th className="py-3 px-4">{t("valuation_progress")}</th>
                      <th className="py-3 px-4">{t("status_header")}</th>
                      <th className="py-3 px-4 text-right">{t("action_header")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredItems.map((item) => (
                      <tr key={item.session_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{item.student_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.registration_number || `Student ID #${item.student_id}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{item.exam_name}</div>
                          <div className="text-[11px] text-indigo-400 font-mono">{item.subject}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300 font-mono">
                          {t("attempt_label")} {item.attempt_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(item.submitted_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-36">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                              <span>{item.evaluated_questions}/{item.total_questions} {t("valuation_progress_count")}</span>
                              <span>{item.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  item.progress_percentage === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                }`}
                                style={{ width: `${item.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.evaluation_status === "PUBLISHED" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {t("published")}
                            </span>
                          ) : item.evaluation_status === "READY_FOR_PUBLICATION" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {t("ready_to_publish")}
                            </span>
                          ) : item.evaluation_status === "EVALUATION_IN_PROGRESS" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {t("in_progress")}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {t("awaiting_valuation")}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openValuationWorkspace(item.session_id)}
                            className="text-xs shadow-sm"
                          >
                            {t("launch_valuation_workspace")} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Valuation Workspace View */}
        {selectedSessionId && sessionDetail && (
          <div className="space-y-6">
            {/* Candidate & Session Header Card */}
            <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <button
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSessionDetail(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-2 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> {t("back_to_queue")}
                  </button>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{sessionDetail.student_name}</h2>
                    {sessionDetail.registration_number && (
                      <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {sessionDetail.registration_number}
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      {t("attempt_label")} #{sessionDetail.attempt_number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><strong>{t("exam_label")}:</strong> <span className="text-slate-200">{sessionDetail.exam_name}</span></span>
                    <span><strong>{t("subject_label")}:</strong> <span className="text-indigo-400">{sessionDetail.subject}</span></span>
                    <span><strong>{t("submitted_at_header")}:</strong> <span className="text-slate-300 font-mono">{new Date(sessionDetail.submitted_at).toLocaleString()}</span></span>
                  </div>
                </div>

                {/* Score & Progress Summary */}
                <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t("current_score")}</div>
                    <div className="text-2xl font-black text-white font-mono">
                      {sessionDetail.current_total_marks.toFixed(1)}{" "}
                      <span className="text-sm font-semibold text-slate-400">/ {sessionDetail.maximum_marks}</span>
                    </div>
                  </div>

                  <div className="w-px h-10 bg-slate-800 hidden sm:block" />

                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t("status_header")}</div>
                    <div>
                      {sessionDetail.is_published ? (
                        <Badge variant="emerald" className="font-bold">{t("published")}</Badge>
                      ) : sessionDetail.is_finalized ? (
                        <Badge variant="indigo" className="font-bold">{t("ready_to_publish")}</Badge>
                      ) : (
                        <Badge variant="slate" className="font-bold">{t("in_progress")}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
                  <span>{t("valuation_progress")}: {sessionDetail.evaluated_questions} / {sessionDetail.total_questions} {t("valuation_progress_count")}</span>
                  <span className="font-mono text-indigo-400">{sessionDetail.progress_percentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      sessionDetail.progress_percentage === 100 ? "bg-emerald-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${sessionDetail.progress_percentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Split Workspace: Left Palette + Right Active Question */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Question Navigation Palette (3 columns on large screens) */}
              <div className="lg:col-span-3">
                <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 sticky top-24">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {t("question_palette")}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {sessionDetail.questions.map((q, idx) => {
                      const isEval = q.is_evaluated || q.marks_awarded !== null;
                      const isCurrent = idx === activeQuestionIdx;
                      return (
                        <button
                          key={q.question_id}
                          onClick={() => selectQuestion(idx)}
                          className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                            isCurrent
                              ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0D1322] scale-105 z-10"
                              : ""
                          } ${
                            isEval
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-[#080C14] text-amber-300 hover:bg-slate-800 border border-amber-500/30"
                          }`}
                          title={`${t("question")} ${idx + 1} (${q.question_type}) - ${isEval ? t("evaluated_label") : t("pending_valuation_label")}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] space-y-2 text-slate-400 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-emerald-500" />
                      <span>{t("evaluated_label")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#080C14] border border-amber-500/40" />
                      <span>{t("pending_valuation_label")}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Active Question Panel (9 columns on large screens) */}
              <div className="lg:col-span-9 space-y-6">
                {currentQ && (
                  <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white">
                          {t("question")} #{activeQuestionIdx + 1}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {currentQ.question_type}
                        </span>
                        {currentQ.is_evaluated ? (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {t("evaluated_label")}
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            {t("pending_valuation_label")}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-slate-400 bg-[#080C14] px-3 py-1 rounded-xl border border-slate-800">
                        {t("max_pts")}: <span className="text-indigo-400 font-black font-mono">{currentQ.marks_possible}</span>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="py-4">
                      <div className="text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                        {currentQ.question_text}
                      </div>
                    </div>

                    {/* Candidate's Response Box */}
                    <div className="mt-4 p-5 rounded-2xl bg-[#080C14]/70 border border-slate-800">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>{t("candidate_response")}</span>
                        {currentQ.student_text_answer && (
                          <span className="text-[11px] font-mono font-semibold text-slate-400">
                            {t("words_count")}: {currentQ.student_text_answer.trim().split(/\s+/).filter(Boolean).length}
                          </span>
                        )}
                      </div>

                      {/* Text Answers */}
                      {(currentQ.question_type === "SHORT_ANSWER" || currentQ.question_type === "LONG_ANSWER") && (
                        <div className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal bg-[#0D1322] p-4 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono">
                          {currentQ.student_text_answer || (
                            <span className="text-slate-500 italic">{t("no_text_answer_provided")}</span>
                          )}
                        </div>
                      )}

                      {/* Objective (MCQ / MULTI_SELECT) */}
                      {(currentQ.question_type === "MCQ" || currentQ.question_type === "MULTI_SELECT") && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-200">
                            {t("automated_objective_grading")}
                          </div>
                          <div className="text-xs p-3 rounded-xl bg-[#0D1322] border border-slate-800 space-y-1 font-mono">
                            <div>
                              <strong className="text-slate-400">{t("selected_option_ids_label")}</strong>{" "}
                              <span className="text-white">{currentQ.selected_option_ids?.join(", ") || "None"}</span>
                            </div>
                            <div>
                              <strong className="text-slate-400">{t("correct_option_ids_label")}</strong>{" "}
                              <span className="text-white">{currentQ.correct_option_ids?.join(", ") || "None"}</span>
                            </div>
                            <div className="font-bold text-emerald-400">
                              {t("auto_awarded_marks")} {currentQ.marks_awarded} / {currentQ.marks_possible}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Handwritten Image Answer */}
                      {currentQ.question_type === "IMAGE_UPLOAD" && (
                        <div className="space-y-4">
                          {currentQ.image_path ? (
                            <div>
                              <div className="relative group inline-block rounded-2xl overflow-hidden border border-slate-800 bg-[#080C14]">
                                <img
                                  src={currentQ.image_path}
                                  alt="Candidate Handwritten Answer"
                                  className="max-h-64 object-contain rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setZoomedImage(currentQ.image_path || null)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setZoomedImage(currentQ.image_path || null)}
                                  className="absolute bottom-3 right-3 p-2 bg-black/80 text-white rounded-xl text-xs flex items-center gap-1 backdrop-blur-sm hover:bg-black"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" /> {t("full_zoom")}
                                </button>
                              </div>

                              {/* OCR Extraction Box */}
                              {currentQ.ocr_text && (
                                <div className="mt-4 p-4 rounded-xl bg-[#0D1322] border border-slate-800">
                                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> {t("ocr_extracted_text")}
                                  </div>
                                  <div className="text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed bg-[#080C14] p-3 rounded-lg border border-slate-800">
                                    {currentQ.ocr_text}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic bg-[#0D1322] p-4 rounded-xl border border-slate-800">
                              {t("no_handwritten_image_submitted")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Model Answer / Scheme */}
                    {currentQ.model_answer && (
                      <div className="mt-4 p-4 rounded-2xl bg-[#080C14]/60 border border-slate-800">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> {t("reference_model_answer_rubric")}
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                          {currentQ.model_answer}
                        </div>
                      </div>
                    )}

                    {/* AI Suggested Grading Card */}
                    {(currentQ.ai_suggested_marks !== undefined || currentQ.ai_evaluation) && (
                      <div className="mt-4 p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            {t("ai_recommended_evaluation")}
                          </div>

                          <button
                            type="button"
                            onClick={handleApplyAiMarks}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> {t("apply_suggested_marks")} (
                            {currentQ.ai_suggested_marks ?? currentQ.ai_evaluation?.suggested_marks})
                          </button>
                        </div>

                        <div className="text-xs text-slate-300 mt-2 font-medium">
                          {currentQ.ai_justification || currentQ.ai_evaluation?.justification}
                        </div>
                      </div>
                    )}

                    {/* Authoritative Valuation Input Box */}
                    <div className="mt-6 pt-6 border-t border-slate-800 bg-[#080C14]/80 -mx-6 -mb-6 p-6 rounded-b-2xl">
                      <div className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-400" /> {t("authoritative_valuation_input")}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-bold text-slate-200 mb-1">
                            {t("marks_awarded_label")} ({t("max_pts")}: {currentQ.marks_possible})
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={currentQ.marks_possible}
                            value={marksInput}
                            onChange={(e) => setMarksInput(e.target.value)}
                            placeholder="e.g. 4.5"
                            className="w-full text-base font-black px-3.5 py-2 rounded-xl border border-slate-800 bg-[#080C14] text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-xs font-bold text-slate-200 mb-1">
                            {t("evaluator_feedback_label")}
                          </label>
                          <input
                            type="text"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder={t("feedback_placeholder")}
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#080C14] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-slate-400">
                          {activeQuestionIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => selectQuestion(activeQuestionIdx - 1)}
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-white font-bold"
                            >
                              <ChevronLeft className="w-4 h-4" /> {t("previous_question")}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="primary"
                            size="md"
                            isLoading={isSavingGrade}
                            onClick={handleSaveQuestionGrade}
                            className="gap-2 shadow-md shadow-indigo-500/20"
                          >
                            <Save className="w-4 h-4" /> {t("save_question_valuation")}
                          </Button>

                          {activeQuestionIdx < sessionDetail.questions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => selectQuestion(activeQuestionIdx + 1)}
                              className="inline-flex items-center gap-1 text-slate-200 hover:text-indigo-400 text-xs font-bold px-3 py-2 rounded-xl bg-[#0D1322] border border-slate-800 hover:bg-slate-800 transition-colors"
                            >
                              {t("next_question")} <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Overall Remarks & Finalization Bar */}
                <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> {t("official_evaluator_summary_remarks")}
                  </h3>
                  <textarea
                    rows={3}
                    value={overallRemarks}
                    onChange={(e) => setOverallRemarks(e.target.value)}
                    placeholder={t("summary_remarks_placeholder")}
                    className="w-full text-xs p-3 rounded-xl border border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-500"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-400 font-medium">
                      {sessionDetail.progress_percentage < 100 ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          {t("cannot_finalize_pending_marks")}
                        </span>
                      ) : sessionDetail.is_published ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {t("result_officially_published_notice")}
                        </span>
                      ) : sessionDetail.is_finalized ? (
                        <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          {t("valuation_finalized_ready_notice")}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium">
                          {t("all_questions_evaluated_notice")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Verdict Status Override Selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-300">{t("final_verdict_status")}</label>
                        <select
                          value={evalStatusOverride}
                          onChange={(e) => setEvalStatusOverride(e.target.value)}
                          className="px-3 py-1.5 text-xs border rounded-xl border-slate-800 font-bold text-white bg-[#080C14] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="PASSED">{t("status_passed")}</option>
                          <option value="FAILED">{t("status_failed")}</option>
                        </select>
                      </div>

                      {!sessionDetail.is_finalized && (
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={sessionDetail.progress_percentage < 100 || isFinalizing}
                          isLoading={isFinalizing}
                          onClick={handleFinalize}
                          className="font-bold border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800/60"
                        >
                          {t("finalize_evaluation_button")}
                        </Button>
                      )}

                      <Button
                        variant="primary"
                        size="md"
                        disabled={sessionDetail.progress_percentage < 100 || isPublishing || sessionDetail.is_published}
                        isLoading={isPublishing}
                        onClick={handlePublish}
                        className="gap-2 font-bold shadow-lg shadow-indigo-500/20"
                      >
                        <Send className="w-4 h-4" />
                        {sessionDetail.is_published ? t("result_published_badge") : t("declare_and_publish_result_button")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* High-Resolution Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full max-h-[90vh] bg-[#0D1322] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <span className="text-xs font-bold text-white">{t("handwritten_answer_sheet_full_zoom")}</span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#080C14] flex items-center justify-center">
              <img src={zoomedImage} alt="Zoomed Answer" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
