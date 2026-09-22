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
        evaluator_remarks: overallRemarks.trim() || undefined
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
        evaluator_remarks: overallRemarks.trim() || undefined
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
    <div className="min-h-screen bg-[#FAF8F5] pb-16">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                title="Return to Admin Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[#1C1C1F] flex items-center gap-2">
                  <Shield className="w-6 h-6 text-[#E06A26]" />
                  Platform Valuation & Result Publication
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  Authoritative institutional governance: Grade subjective submissions and publish candidate results
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/results"
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-stone-500" />
                Scorecards & CSV Export
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Awaiting Valuation</div>
                <div className="text-2xl font-black text-[#C85332] mt-1">{totalPending}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#C85332]">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">In Progress</div>
                <div className="text-2xl font-black text-[#D97706] mt-1">{inProgress}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#D97706]">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Ready to Publish</div>
                <div className="text-2xl font-black text-[#E06A26] mt-1">{readyPublish}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] flex items-center justify-center text-[#E06A26]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Published</div>
                <div className="text-2xl font-black text-[#2B7853] mt-1">{published}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#2B7853]">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Valuation Queue Section */}
        {!selectedSessionId && (
          <Card className="p-6 bg-white border-stone-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1F]">Institutional Submissions Queue</h2>
                <p className="text-xs text-stone-500">Platform-wide candidate assessments ready for valuation & publication</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate or exam..."
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E06A26]/40 w-48 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
                  {["ALL", "AWAITING_SUBJECTIVE_EVALUATION", "EVALUATION_IN_PROGRESS", "READY_FOR_PUBLICATION", "PUBLISHED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === st ? "bg-white text-[#1C1C1F] shadow-xs font-bold" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      {st === "ALL" && "All Submissions"}
                      {st === "AWAITING_SUBJECTIVE_EVALUATION" && "Awaiting Valuation"}
                      {st === "EVALUATION_IN_PROGRESS" && "In Progress"}
                      {st === "READY_FOR_PUBLICATION" && "Ready to Publish"}
                      {st === "PUBLISHED" && "Published"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Queue Table */}
            {isLoading ? (
              <div className="py-20 text-center text-stone-400 text-sm">
                <div className="animate-spin w-8 h-8 border-2 border-[#E06A26] border-t-transparent rounded-full mx-auto mb-3" />
                Loading evaluation queue...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-stone-400 text-sm">
                <CheckCircle2 className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                No submissions matching current filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Exam & Subject</th>
                      <th className="py-3 px-4">Attempt #</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Evaluation Progress</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredItems.map((item) => (
                      <tr key={item.session_id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#1C1C1F]">{item.student_name}</div>
                          <div className="text-[11px] text-stone-400 font-mono">
                            {item.registration_number || `Student ID #${item.student_id}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-800">{item.exam_name}</div>
                          <div className="text-[11px] text-stone-400">{item.subject}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-700">
                          Attempt {item.attempt_number}
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                          {new Date(item.submitted_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-36">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-stone-600 mb-1">
                              <span>{item.evaluated_questions}/{item.total_questions} Evaluated</span>
                              <span>{item.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  item.progress_percentage === 100 ? "bg-[#2B7853]" : "bg-[#E06A26]"
                                }`}
                                style={{ width: `${item.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.evaluation_status === "PUBLISHED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#2B7853] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Published
                            </span>
                          )}
                          {item.evaluation_status === "READY_FOR_PUBLICATION" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]">
                              <Check className="w-3 h-3" /> Ready to Publish
                            </span>
                          )}
                          {item.evaluation_status === "EVALUATION_IN_PROGRESS" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-[#D97706] border border-amber-200">
                              <Clock className="w-3 h-3" /> In Progress
                            </span>
                          )}
                          {item.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-[#C85332] border border-rose-200">
                              <AlertCircle className="w-3 h-3" /> Awaiting Valuation
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openValuationWorkspace(item.session_id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#1C1C1F] hover:bg-[#25252A] text-white transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#E06A26]" />
                            Evaluate
                          </button>
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
            <Card className="p-6 bg-white border-stone-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <button
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSessionDetail(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-900 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Queue
                  </button>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-[#1C1C1F]">{sessionDetail.student_name}</h2>
                    {sessionDetail.registration_number && (
                      <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                        {sessionDetail.registration_number}
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]">
                      Attempt #{sessionDetail.attempt_number}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><strong>Exam:</strong> {sessionDetail.exam_name}</span>
                    <span><strong>Subject:</strong> {sessionDetail.subject}</span>
                    <span><strong>Submitted:</strong> {new Date(sessionDetail.submitted_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Score & Progress Summary */}
                <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-stone-100">
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Current Score</div>
                    <div className="text-2xl font-black text-[#1C1C1F]">
                      {sessionDetail.current_total_marks.toFixed(1)}{" "}
                      <span className="text-sm font-semibold text-stone-400">/ {sessionDetail.maximum_marks}</span>
                    </div>
                  </div>

                  <div className="w-px h-10 bg-stone-200 hidden sm:block" />

                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Status</div>
                    <div>
                      {sessionDetail.is_published ? (
                        <Badge variant="success" className="font-bold">Published</Badge>
                      ) : sessionDetail.is_finalized ? (
                        <Badge variant="terracotta" className="font-bold">Ready to Publish</Badge>
                      ) : (
                        <Badge variant="slate" className="font-bold">Valuation In Progress</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-1.5">
                  <span>Valuation Progress: {sessionDetail.evaluated_questions} of {sessionDetail.total_questions} Questions Evaluated</span>
                  <span>{sessionDetail.progress_percentage}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      sessionDetail.progress_percentage === 100 ? "bg-[#2B7853]" : "bg-[#E06A26]"
                    }`}
                    style={{ width: `${sessionDetail.progress_percentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Split Workspace: Left Palette + Right Active Question */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Question Navigation Palette */}
              <div className="lg:col-span-3">
                <Card className="p-4 bg-white border-stone-200 sticky top-24">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
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
                              ? "ring-2 ring-[#E06A26] ring-offset-2 scale-105 z-10"
                              : ""
                          } ${
                            isEval
                              ? "bg-[#2B7853] text-white hover:bg-[#236344]"
                              : "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300"
                          }`}
                          title={`Question ${idx + 1} (${q.question_type}) - ${isEval ? "Evaluated" : "Pending"}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100 text-[11px] space-y-2 text-stone-600 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#2B7853]" />
                      <span>Evaluated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300" />
                      <span>Pending Valuation</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Active Question Panel */}
              <div className="lg:col-span-9 space-y-6">
                {currentQ && (
                  <Card className="p-6 bg-white border-stone-200">
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[#1C1C1F]">
                          Question #{activeQuestionIdx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {currentQ.question_type}
                        </span>
                        {currentQ.is_evaluated ? (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#2B7853] border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Evaluated
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200">
                            Pending Valuation
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-stone-600 bg-stone-50 px-3 py-1 rounded-xl border border-stone-200">
                        Max Marks: <span className="text-[#E06A26] font-black">{currentQ.marks_possible}</span>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="py-4">
                      <div className="text-sm text-stone-900 leading-relaxed font-medium whitespace-pre-wrap">
                        {currentQ.question_text}
                      </div>
                    </div>

                    {/* Candidate's Response Box */}
                    <div className="mt-4 p-5 rounded-2xl bg-[#FAF8F5] border border-stone-200">
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Candidate's Response</span>
                        {currentQ.student_text_answer && (
                          <span className="text-[11px] font-mono font-semibold text-stone-500">
                            Words: {currentQ.student_text_answer.trim().split(/\s+/).filter(Boolean).length}
                          </span>
                        )}
                      </div>

                      {/* Text Answers */}
                      {(currentQ.question_type === "SHORT_ANSWER" || currentQ.question_type === "LONG_ANSWER") && (
                        <div className="text-xs sm:text-sm text-stone-900 leading-relaxed font-normal bg-white p-4 rounded-xl border border-stone-200 whitespace-pre-wrap">
                          {currentQ.student_text_answer || (
                            <span className="text-stone-400 italic">No text answer provided by candidate.</span>
                          )}
                        </div>
                      )}

                      {/* Objective (MCQ / MULTI_SELECT) */}
                      {(currentQ.question_type === "MCQ" || currentQ.question_type === "MULTI_SELECT") && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-stone-700">
                            Automated Objective Grading Result:
                          </div>
                          <div className="text-xs p-3 rounded-xl bg-white border border-stone-200 space-y-1">
                            <div>
                              <strong>Selected Option IDs:</strong>{" "}
                              {currentQ.selected_option_ids?.join(", ") || "None"}
                            </div>
                            <div>
                              <strong>Correct Option IDs:</strong>{" "}
                              {currentQ.correct_option_ids?.join(", ") || "None"}
                            </div>
                            <div className="font-bold text-[#2B7853]">
                              Auto Awarded: {currentQ.marks_awarded} / {currentQ.marks_possible} marks
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Handwritten Image Answer */}
                      {currentQ.question_type === "IMAGE_UPLOAD" && (
                        <div className="space-y-4">
                          {currentQ.image_path ? (
                            <div>
                              <div className="relative group inline-block rounded-2xl overflow-hidden border border-stone-200 bg-white">
                                <img
                                  src={currentQ.image_path}
                                  alt="Candidate Handwritten Answer"
                                  className="max-h-64 object-contain rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setZoomedImage(currentQ.image_path || null)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setZoomedImage(currentQ.image_path || null)}
                                  className="absolute bottom-3 right-3 p-2 bg-stone-900/80 text-white rounded-xl text-xs flex items-center gap-1 backdrop-blur-xs hover:bg-stone-900"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" /> Full Zoom
                                </button>
                              </div>

                              {/* OCR Extraction Box */}
                              {currentQ.ocr_text && (
                                <div className="mt-4 p-4 rounded-xl bg-white border border-stone-200">
                                  <div className="text-[11px] font-bold text-[#E06A26] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Extracted Handwritten Text via OCR
                                  </div>
                                  <div className="text-xs text-stone-800 whitespace-pre-wrap font-mono leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-100">
                                    {currentQ.ocr_text}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-stone-400 italic bg-white p-4 rounded-xl border border-stone-200">
                              No handwritten answer image submitted.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Model Answer / Scheme */}
                    {currentQ.model_answer && (
                      <div className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                        <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-stone-400" /> Reference Model Answer / Key Points
                        </div>
                        <div className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                          {currentQ.model_answer}
                        </div>
                      </div>
                    )}

                    {/* AI Suggested Grading Card */}
                    {(currentQ.ai_suggested_marks !== undefined || currentQ.ai_evaluation) && (
                      <div className="mt-4 p-5 rounded-2xl bg-[#FEF3EC] border border-[#FAD9C5]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#C95716]">
                            <Sparkles className="w-4 h-4 text-[#E06A26]" />
                            AI Recommended Evaluation
                          </div>

                          <button
                            type="button"
                            onClick={handleApplyAiMarks}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#E06A26] hover:bg-[#C95716] text-white shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Apply Suggested Marks (
                            {currentQ.ai_suggested_marks ?? currentQ.ai_evaluation?.suggested_marks} Marks)
                          </button>
                        </div>

                        <div className="text-xs text-stone-700 mt-2 font-medium">
                          {currentQ.ai_justification || currentQ.ai_evaluation?.justification}
                        </div>
                      </div>
                    )}

                    {/* Authoritative Valuation Input Box */}
                    <div className="mt-6 pt-6 border-t border-stone-200 bg-stone-50/60 -mx-6 -mb-6 p-6 rounded-b-2xl">
                      <div className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#E06A26]" /> Authoritative Valuation Input
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Marks Awarded (Max: {currentQ.marks_possible})
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={currentQ.marks_possible}
                            value={marksInput}
                            onChange={(e) => setMarksInput(e.target.value)}
                            placeholder="e.g. 4.5"
                            className="w-full text-base font-black px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#E06A26]"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Evaluator Question Feedback / Annotations
                          </label>
                          <input
                            type="text"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder="Specific feedback on this response..."
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#E06A26]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-stone-400">
                          {activeQuestionIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => selectQuestion(activeQuestionIdx - 1)}
                              className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 font-bold"
                            >
                              <ChevronLeft className="w-4 h-4" /> Previous Question
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
                            className="gap-2"
                          >
                            <Save className="w-4 h-4" /> Save Question Valuation
                          </Button>

                          {activeQuestionIdx < sessionDetail.questions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => selectQuestion(activeQuestionIdx + 1)}
                              className="inline-flex items-center gap-1 text-stone-700 hover:text-[#E06A26] text-xs font-bold px-3 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
                            >
                              Next Question <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Overall Remarks & Finalization Bar */}
                <Card className="p-6 bg-white border-stone-200">
                  <h3 className="text-sm font-bold text-[#1C1C1F] mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#E06A26]" /> Official Evaluator Summary Remarks
                  </h3>
                  <textarea
                    rows={3}
                    value={overallRemarks}
                    onChange={(e) => setOverallRemarks(e.target.value)}
                    placeholder="Enter comprehensive evaluator remarks to be printed on the official student result certificate..."
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E06A26]/40"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-stone-100">
                    <div className="text-xs text-stone-500 font-medium">
                      {sessionDetail.progress_percentage < 100 ? (
                        <span className="text-[#C85332] font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          Cannot finalize: {sessionDetail.total_questions - sessionDetail.evaluated_questions} questions still require marks.
                        </span>
                      ) : sessionDetail.is_published ? (
                        <span className="text-[#2B7853] font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Result is officially published. Scorecard and certified PDF are active.
                        </span>
                      ) : sessionDetail.is_finalized ? (
                        <span className="text-[#E06A26] font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          Valuation is finalized and Ready for Official Publication.
                        </span>
                      ) : (
                        <span className="text-stone-600 font-medium">
                          All questions evaluated. You can now finalize this assessment.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {!sessionDetail.is_finalized && (
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={sessionDetail.progress_percentage < 100 || isFinalizing}
                          isLoading={isFinalizing}
                          onClick={handleFinalize}
                          className="font-bold"
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
                        className="gap-2 font-bold"
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
      </div>

      {/* High-Resolution Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <span className="text-xs font-bold text-stone-700">Handwritten Answer Sheet - Full Zoom</span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-stone-100 flex items-center justify-center">
              <img src={zoomedImage} alt="Zoomed Answer" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
