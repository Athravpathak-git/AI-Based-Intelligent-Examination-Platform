"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
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
  Shield,
  Layers,
  FileSpreadsheet
} from "lucide-react";

export default function AdminEvaluationsPage() {
  const router = useRouter();

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

  // 1. Fetch pending evaluations queue across entire platform
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
      setErrorMessage(`Please enter a valid mark between 0 and ${activeQ.marks_possible}.`);
      return;
    }

    setIsSavingGrade(true);
    setErrorMessage(null);
    try {
      await api.post(`/evaluations/session/${selectedSessionId}/grade-question`, {
        question_id: activeQ.question_id,
        marks_awarded: parsedMarks,
        evaluator_feedback: feedbackInput.trim() || undefined
      });

      setSuccessMessage(`Marks saved for Question #${activeQuestionIdx + 1}`);

      const res = await api.get<EvaluationSessionDetailResponse>(`/evaluations/session/${selectedSessionId}`);
      setSessionDetail(res.data);
      loadQuestionGradingState(res.data.questions[activeQuestionIdx]);
      fetchQueue();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsSavingGrade(false);
    }
  };

  // 4. Apply AI suggested marks
  const handleApplyAiMarks = () => {
    if (!sessionDetail) return;
    const activeQ = sessionDetail.questions[activeQuestionIdx];
    if (!activeQ) return;

    const aiMarks = activeQ.ai_suggested_marks ?? activeQ.ai_evaluation?.suggested_marks;
    if (aiMarks !== undefined && aiMarks !== null) {
      setMarksInput(String(aiMarks));
      if (activeQ.ai_justification && !feedbackInput) {
        setFeedbackInput(`AI Recommendation: ${activeQ.ai_justification}`);
      }
    }
  };

  // 5. Finalize Evaluation
  const handleFinalize = async () => {
    if (!selectedSessionId) return;
    setIsFinalizing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.post(`/evaluations/session/${selectedSessionId}/finalize`, {
        evaluator_remarks: overallRemarks.trim() || undefined,
        status: evalStatusOverride
      });
      setSuccessMessage(res.data.message || "Evaluation finalized successfully. Result is Ready for Publication.");

      const updated = await api.get<EvaluationSessionDetailResponse>(`/evaluations/session/${selectedSessionId}`);
      setSessionDetail(updated.data);
      fetchQueue();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsFinalizing(false);
    }
  };

  // 6. Publish Result
  const handlePublish = async () => {
    if (!selectedSessionId) return;
    if (!confirm("Are you sure you want to declare and publish this official examination result to the candidate?")) {
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.post(`/evaluations/session/${selectedSessionId}/publish`, {
        evaluator_remarks: overallRemarks.trim() || undefined,
        status: evalStatusOverride
      });
      setSuccessMessage(res.data.message || "Result officially published. Candidate can now view their scorecard and download PDF.");

      const updated = await api.get<EvaluationSessionDetailResponse>(`/evaluations/session/${selectedSessionId}`);
      setSessionDetail(updated.data);
      fetchQueue();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  // Filtering queue items
  const filteredItems = items.filter((item) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      item.evaluation_status === statusFilter ||
      (statusFilter === "PENDING" && item.evaluation_status !== "PUBLISHED");

    const matchesSearch =
      searchQuery === "" ||
      item.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.exam_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.registration_number && item.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Metrics counters
  const totalPending = items.filter((i) => i.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION").length;
  const inProgress = items.filter((i) => i.evaluation_status === "EVALUATION_IN_PROGRESS").length;
  const readyPublish = items.filter((i) => i.evaluation_status === "READY_FOR_PUBLICATION").length;
  const published = items.filter((i) => i.evaluation_status === "PUBLISHED").length;

  const currentQ = sessionDetail ? sessionDetail.questions[activeQuestionIdx] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-[#0D1322] border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Return to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-indigo-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-400" /> Platform Valuation & Grading Governance
            </h1>
            <p className="text-xs text-slate-400">
              Institution-wide authoritative evaluation verification and publication oversight.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Valuation</span>
          <div className="text-2xl font-black text-rose-400 font-mono">{totalPending}</div>
          <p className="text-[10px] text-slate-500">Unassigned / Subjective Submissions</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
          <div className="text-2xl font-black text-amber-400 font-mono">{inProgress}</div>
          <p className="text-[10px] text-slate-500">Actively Being Reviewed</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ready to Publish</span>
          <div className="text-2xl font-black text-indigo-400 font-mono">{readyPublish}</div>
          <p className="text-[10px] text-slate-500">Fully Graded, Awaiting Admin Sign-off</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published Results</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{published}</div>
          <p className="text-[10px] text-slate-500">Officially Declared to Candidates</p>
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* QUEUE VIEW (If no session selected) */}
      {!selectedSessionId && (
        <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Platform Submission Queue</h2>
              <p className="text-xs text-slate-400">Select any candidate submission to verify valuation or publish results.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search candidate or exam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-[#080C14] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center p-0.5 bg-[#080C14] rounded-xl border border-slate-800 text-xs font-semibold">
                {[
                  { key: "ALL", label: "All" },
                  { key: "PENDING", label: "Pending Sign-off" },
                  { key: "READY_FOR_PUBLICATION", label: "Ready to Publish" },
                  { key: "PUBLISHED", label: "Published" }
                ].map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => setStatusFilter(btn.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === btn.key
                        ? "bg-indigo-600 text-white shadow-sm font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2" />
              Loading submission queue...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No submissions matching the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Exam & Subject</th>
                    <th className="py-3 px-4">Attempt</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredItems.map((item) => (
                    <tr key={item.session_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.student_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.registration_number || `ID #${item.student_id}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{item.exam_name}</div>
                        <div className="text-[11px] text-indigo-400 font-mono">{item.subject}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        Attempt #{item.attempt_number}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(item.submitted_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>{item.evaluated_questions}/{item.total_questions}</span>
                            <span>{item.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.evaluation_status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.evaluation_status === "READY_FOR_PUBLICATION"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : item.evaluation_status === "EVALUATION_IN_PROGRESS"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {item.evaluation_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openValuationWorkspace(item.session_id)}
                          className="text-xs shadow-sm"
                        >
                          Open Review &rarr;
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

      {/* ACTIVE VALUATION WORKSPACE VIEW */}
      {selectedSessionId && sessionDetail && (
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => {
                    setSelectedSessionId(null);
                    setSessionDetail(null);
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-2 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Queue
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{sessionDetail.student_name}</h2>
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {sessionDetail.registration_number || "REG-UNASSIGNED"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                  <span><strong>Exam:</strong> {sessionDetail.exam_name} ({sessionDetail.subject})</span>
                  <span>&bull;</span>
                  <span><strong>Attempt:</strong> #{sessionDetail.attempt_number}</span>
                  <span>&bull;</span>
                  <span><strong>Submitted:</strong> {new Date(sessionDetail.submitted_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="bg-[#080C14] px-4 py-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Score</span>
                  <span className="text-xl font-extrabold text-white font-mono">
                    {sessionDetail.current_total_marks.toFixed(1)} / {sessionDetail.maximum_marks}
                  </span>
                </div>

                <div className="bg-[#080C14] px-4 py-2 rounded-xl border border-slate-800 text-center min-w-[120px]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                  <span className="text-xs font-bold text-indigo-400 font-mono">
                    {sessionDetail.is_published ? "PUBLISHED" : sessionDetail.is_finalized ? "READY TO PUBLISH" : "IN REVIEW"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Split Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Palette */}
            <div className="lg:col-span-3">
              <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 sticky top-24 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question Palette
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
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Active Question Panel */}
            <div className="lg:col-span-9 space-y-6">
              {currentQ && (
                <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">Question #{activeQuestionIdx + 1}</span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {currentQ.question_type}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-400 font-mono bg-[#080C14] px-3 py-1 rounded-xl border border-slate-800">
                      Max Pts: {currentQ.marks_possible}
                    </span>
                  </div>

                  <div className="text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                    {currentQ.question_text}
                  </div>

                  {/* Candidate Answer Box */}
                  <div className="p-4 rounded-xl bg-[#080C14]/70 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Candidate Response</span>
                    <div className="text-xs font-mono text-slate-100 whitespace-pre-wrap bg-[#0D1322] p-3 rounded-lg border border-slate-800">
                      {currentQ.student_text_answer || <span className="text-slate-500 italic">No text submission provided</span>}
                    </div>

                    {currentQ.image_path && (
                      <div className="pt-2">
                        <img
                          src={currentQ.image_path}
                          alt="Handwritten Answer"
                          className="max-h-48 object-contain rounded-lg border border-slate-800 cursor-pointer"
                          onClick={() => setZoomedImage(currentQ.image_path || null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Model Rubric */}
                  {currentQ.model_answer && (
                    <div className="p-3 bg-[#080C14]/60 border border-slate-800 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Reference Model Answer Rubric
                      </span>
                      <p className="text-slate-300 font-mono whitespace-pre-wrap">{currentQ.model_answer}</p>
                    </div>
                  )}

                  {/* AI Recommendation */}
                  {(currentQ.ai_suggested_marks !== undefined || currentQ.ai_evaluation) && (
                    <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-400" /> AI Suggested Marks
                        </span>
                        <p className="text-xs text-slate-300 mt-1 font-mono">
                          {currentQ.ai_justification || currentQ.ai_evaluation?.justification}
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApplyAiMarks}
                        className="text-xs font-bold shrink-0"
                      >
                        Apply AI ({currentQ.ai_suggested_marks ?? currentQ.ai_evaluation?.suggested_marks} pts)
                      </Button>
                    </div>
                  )}

                  {/* Authoritative Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-800">
                    <div className="sm:col-span-4">
                      <label className="text-xs font-bold text-slate-300 block mb-1">Marks Awarded</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={currentQ.marks_possible}
                        value={marksInput}
                        onChange={(e) => setMarksInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-bold font-mono bg-[#080C14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-8">
                      <label className="text-xs font-bold text-slate-300 block mb-1">Evaluator Feedback</label>
                      <input
                        type="text"
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Feedback on candidate methodology..."
                        className="w-full px-3 py-2 text-xs bg-[#080C14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isSavingGrade}
                      onClick={handleSaveQuestionGrade}
                      className="text-xs shadow-md shadow-indigo-500/20"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" /> Save Question Marks
                    </Button>
                  </div>
                </Card>
              )}

              {/* Finalization Card */}
              <Card className="p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" /> Official Summary Remarks
                </h3>
                <textarea
                  rows={2}
                  value={overallRemarks}
                  onChange={(e) => setOverallRemarks(e.target.value)}
                  placeholder="Official comments on performance..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-800 bg-[#080C14] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-300">Final Verdict Status:</label>
                    <select
                      value={evalStatusOverride}
                      onChange={(e) => setEvalStatusOverride(e.target.value)}
                      className="px-3 py-1.5 text-xs border rounded-xl border-slate-800 font-bold text-white bg-[#080C14] focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    {!sessionDetail.is_finalized && (
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={sessionDetail.progress_percentage < 100 || isFinalizing}
                        isLoading={isFinalizing}
                        onClick={handleFinalize}
                        className="font-bold border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800/60"
                      >
                        Finalize Evaluation
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
                      {sessionDetail.is_published ? "Result Published" : "Declare & Publish Result"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full max-h-[90vh] bg-[#0D1322] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <span className="text-xs font-bold text-white">Handwritten Answer Sheet - Full Zoom</span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#080C14] flex items-center justify-center">
              <img src={zoomedImage} alt="Zoomed Answer" className="max-w-full max-h-full object-contain rounded-lg border border-slate-800" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
