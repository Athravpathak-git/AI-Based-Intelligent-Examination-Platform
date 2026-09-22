"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { Exam, GeneratedPaper, StudentQuestion } from "@/types";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import { Clock, CheckCircle2, ShieldAlert, ArrowLeft, Send } from "lucide-react";

export default function StudentExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student answer state (for Week 1 & 2 verification)
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      setIsLoadingExam(true);
      setError(null);
      try {
        const res = await api.get<Exam>(`/exams/${examId}`);
        setExam(res.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingExam(false);
      }
    };
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);
    try {
      await api.post(`/exams/${examId}/register`);
      setRegSuccessMessage("Successfully registered! Your seat has been confirmed for this examination.");
      if (exam) {
        setExam({ ...exam, is_registered: true });
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (err.response?.status === 409 || msg.toLowerCase().includes("already registered")) {
        setRegSuccessMessage("You are already registered for this examination.");
        if (exam) {
          setExam({ ...exam, is_registered: true });
        }
      } else {
        setError(msg);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGeneratePaper = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.post<GeneratedPaper>(`/exams/${examId}/generate-paper`);
      setPaper(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionSelect = (questionId: number, optionId: number, isMulti: boolean) => {
    if (isMulti) {
      const current = (answers[questionId] as number[]) || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setAnswers({ ...answers, [questionId]: updated });
    } else {
      setAnswers({ ...answers, [questionId]: optionId });
    }
  };

  const handleTextAnswer = (questionId: number, text: string) => {
    setAnswers({ ...answers, [questionId]: text });
  };

  if (isLoadingExam) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E06A26]"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-4">
        <Alert type="error">{error || "Exam not found."}</Alert>
        <Button variant="outline" onClick={() => router.push("/student")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/student")}
          className="text-xs font-semibold text-[#6B6B76] hover:text-[#1C1C1F] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <Badge variant="saffron">Candidate Session</Badge>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Header Info */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#171719] via-[#242428] to-[#1C1C1F] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-[#2F2F36] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{exam.name}</h1>
            <p className="text-sm text-[#FAF8F5]/70 mt-1">
              Subject: <span className="font-bold text-white">{exam.subject}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-center">
              <span className="block text-[11px] text-[#FAF8F5]/60 font-semibold uppercase">Duration</span>
              <span className="text-lg font-bold font-mono">{exam.duration_minutes}m</span>
            </div>
            <div className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-center">
              <span className="block text-[11px] text-[#FAF8F5]/60 font-semibold uppercase">Questions</span>
              <span className="text-lg font-bold font-mono">{exam.total_questions}</span>
            </div>
            <div className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-center">
              <span className="block text-[11px] text-[#FAF8F5]/60 font-semibold uppercase">Max Marks</span>
              <span className="text-lg font-bold font-mono text-[#E06A26]">{exam.maximum_marks}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-2 text-xs">
          <span className="bg-white/10 border border-white/15 px-3 py-1 rounded-full font-mono text-[#FAF8F5]/70">
            Window: {new Date(exam.start_time).toLocaleTimeString()} – {new Date(exam.end_time).toLocaleTimeString()}
          </span>
          {exam.negative_marking_enabled && (
            <span className="bg-[#FEF3EC] text-[#C85332] border border-[#F8DDD5] px-3 py-1 rounded-full font-semibold">
              Negative Marking Enabled
            </span>
          )}
          {exam.webcam_monitoring_enabled && (
            <span className="bg-white/15 text-white border border-white/20 px-3 py-1 rounded-full font-semibold">
              Proctored Environment Active
            </span>
          )}
        </div>
      </div>

      {regSuccessMessage && (
        <Alert type="info">{regSuccessMessage}</Alert>
      )}

      {/* If paper has not been generated yet */}
      {!paper ? (
        <Card className="text-center py-12 space-y-4">
          {exam.is_completed ? (
            <>
              <div className="inline-flex p-3.5 rounded-2xl bg-[#FAF8F5] text-[#6B6B76] border border-[#EAE6DF] mx-auto">
                <CheckCircle2 className="h-10 w-10 text-[#6B6B76]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#EAE6DF] rounded-full text-xs font-bold text-[#6B6B76] mx-auto">
                <CheckCircle2 className="h-3.5 w-3.5" /> Exam Already Completed
              </div>
              <h2 className="text-xl font-bold text-[#1C1C1F]">Assessment Completed</h2>
              <p className="text-xs sm:text-sm text-[#6B6B76] max-w-md mx-auto leading-relaxed">
                You have already completed and submitted your examination. Your responses have been saved and evaluated in the official platform records.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/student/results?exam_id=${examId}`)}
                  className="px-8 shadow-saffron/20"
                >
                  View Assessment Result
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/student")}
                  className="text-[#6B6B76]"
                >
                  Back to Dashboard
                </Button>
              </div>
            </>
          ) : !exam.is_registered ? (
            <>
              <div className="inline-flex p-3.5 rounded-2xl bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5] mx-auto">
                <ShieldAlert className="h-10 w-10 text-[#E06A26]" />
              </div>
              <h2 className="text-xl font-bold text-[#1C1C1F]">Registration Required</h2>
              <p className="text-xs sm:text-sm text-[#6B6B76] max-w-md mx-auto leading-relaxed">
                You must register for this examination before entering instructions or attempting questions. Confirm your registration below.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRegister}
                  isLoading={isRegistering}
                  className="px-8 shadow-saffron/20"
                >
                  Register for Examination
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex p-3.5 rounded-2xl bg-[#EFF7F2] text-[#2B7853] border border-[#C4DFD3] mx-auto">
                <CheckCircle2 className="h-10 w-10 text-[#2B7853]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF7F2] border border-[#C4DFD3] rounded-full text-xs font-bold text-[#2B7853] mx-auto">
                <CheckCircle2 className="h-3.5 w-3.5" /> Seat Confirmed (Registered)
              </div>
              <h2 className="text-xl font-bold text-[#1C1C1F]">Ready to Begin Examination?</h2>
              <p className="text-xs sm:text-sm text-[#6B6B76] max-w-md mx-auto leading-relaxed">
                Your registration is confirmed. Proceed to review dynamic instructions, accept proctoring rules, and launch your exam session.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/student/exams/${examId}/instructions`)}
                  className="px-8 shadow-saffron/20"
                >
                  Enter Instructions & Start Exam
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleGeneratePaper}
                  isLoading={isGenerating}
                  className="text-[#6B6B76]"
                >
                  Preview Paper (Verification Mode)
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : (
        /* Rendered Question Paper */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#EFF7F2] border border-[#C4DFD3] p-4 rounded-xl text-[#2B7853] text-sm font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                <strong>Paper Generated Successfully!</strong> Randomized deterministic paper ready.
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-[#C4DFD3]/50 px-3 py-1 rounded-full">
              {paper.questions.length} Questions Loaded
            </span>
          </div>

          <div className="space-y-6">
            {paper.questions.map((q: StudentQuestion, idx: number) => {
              const isMulti = q.question_type === "MULTI_SELECT";
              const isMCQ = q.question_type === "MCQ";

              return (
                <Card key={q.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-2 border-b border-[#EAE6DF] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-[#FEF3EC] text-[#E06A26] font-bold text-xs flex items-center justify-center border border-[#FAD9C5]">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B76]">
                        {q.question_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={q.difficulty === "HARD" ? "rose" : q.difficulty === "MEDIUM" ? "amber" : "emerald"}>
                        {q.difficulty}
                      </Badge>
                      <Badge variant="saffron">{q.marks} pts</Badge>
                    </div>
                  </div>

                  <p className="text-base font-medium text-[#1C1C1F] leading-relaxed whitespace-pre-wrap">
                    {q.question_text}
                  </p>

                  {/* MCQ & Multi-Select Options */}
                  {(isMCQ || isMulti) && (
                    <div className="space-y-2.5 pt-2">
                      {q.options.map((opt) => {
                        const isSelected = isMulti
                          ? (answers[q.id] as number[] || []).includes(opt.id)
                          : answers[q.id] === opt.id;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleOptionSelect(q.id, opt.id, isMulti)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-[#FEF3EC] border-[#E06A26] text-[#1C1C1F] font-medium ring-1 ring-[#E06A26]/30"
                                : "bg-white border-[#EAE6DF] hover:bg-[#FAF8F5] text-[#1C1C1F]"
                            }`}
                          >
                            <input
                              type={isMulti ? "checkbox" : "radio"}
                              name={`question-${q.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 text-[#E06A26] focus:ring-[#E06A26] rounded"
                            />
                            <span className="text-sm font-medium text-[#1C1C1F]">{opt.option_text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Answers */}
                  {["SHORT_ANSWER", "LONG_ANSWER"].includes(q.question_type) && (
                    <div className="pt-2">
                      <textarea
                        rows={q.question_type === "LONG_ANSWER" ? 5 : 2}
                        value={answers[q.id] || ""}
                        onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                        placeholder="Type your response here..."
                        className="w-full px-3.5 py-2.5 text-sm bg-white text-[#1C1C1F] placeholder-[#6B6B76] border rounded-xl border-[#EAE6DF] focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Image Upload Question Type */}
                  {q.question_type === "IMAGE_UPLOAD" && (
                    <div className="pt-2 p-6 border-2 border-dashed rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-center space-y-2">
                      <p className="text-xs font-semibold text-[#6B6B76]">Diagram / Handwritten Solution Upload (PNG, JPEG, WEBP - Max 5MB)</p>
                      <p className="text-[11px] text-[#E06A26]">File upload and automated OCR pipeline enabled in exam attempt workspace.</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="flex items-center justify-between p-4 bg-[#FAF8F5]">
            <span className="text-xs text-[#6B6B76]">
              Exam paper generated and bound to candidate ID. (Week 1–2 Verification Mode)
            </span>
            <Button variant="primary" onClick={() => alert("Week 1 & 2 Paper Generation and Answering verified successfully!")}>
              Submit Verification
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
