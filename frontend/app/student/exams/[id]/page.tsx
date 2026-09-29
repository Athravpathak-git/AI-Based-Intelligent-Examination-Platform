"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { Exam, GeneratedPaper, StudentQuestion } from "@/types";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import { useLanguage } from "@/lib/i18n";
import { Clock, CheckCircle2, ShieldAlert, ArrowLeft, Send } from "lucide-react";

export default function StudentExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const { t } = useLanguage();

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
      <div className="flex justify-center p-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Alert type="error">{error || "Exam not found."}</Alert>
        <Button variant="outline" onClick={() => router.push("/student")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("back_to_dashboard")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/student")}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back_to_dashboard")}
        </button>
        <Badge variant="indigo">{t("student")}</Badge>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Header Info */}
      <div className="relative overflow-hidden bg-[#0D1322]/90 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{exam.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {t("subject")}: <span className="font-semibold text-indigo-300">{exam.subject}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">{t("duration")}</span>
              <span className="text-lg font-bold font-mono text-white">{exam.duration_minutes}m</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">{t("questions")}</span>
              <span className="text-lg font-bold font-mono text-white">{exam.total_questions}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">{t("total_marks")}</span>
              <span className="text-lg font-bold font-mono text-indigo-400">{exam.maximum_marks}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-2 text-xs">
          <span className="bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full font-mono text-slate-400">
            {t("start_window")} {new Date(exam.start_time).toLocaleTimeString()} – {new Date(exam.end_time).toLocaleTimeString()}
          </span>
          {exam.negative_marking_enabled && (
            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-semibold">
              {t("negative_marking")}
            </span>
          )}
          {exam.webcam_monitoring_enabled && (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
              {t("proctored")}
            </span>
          )}
        </div>
      </div>

      {regSuccessMessage && (
        <Alert type="info">{regSuccessMessage}</Alert>
      )}

      {/* If paper has not been generated yet */}
      {!paper ? (
        <Card className="text-center py-12 space-y-4 border-slate-800 bg-[#0D1322]/90 shadow-xl">
          {exam.is_completed ? (
            <>
              <div className="inline-flex p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 mx-auto">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("exam_completed_title")}
              </div>
              <h2 className="text-xl font-bold text-white">{t("completed_exams")}</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {t("no_completed_exams_desc")}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/student/results?exam_id=${examId}`)}
                  className="px-8 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
                >
                  {t("view_result")}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/student")}
                  className="text-slate-300 border-slate-700 bg-slate-800/60 hover:bg-slate-700 hover:text-white"
                >
                  {t("back_to_dashboard")}
                </Button>
              </div>
            </>
          ) : !exam.is_registered ? (
            <>
              <div className="inline-flex p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mx-auto">
                <ShieldAlert className="h-10 w-10 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t("registration_required")}</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {t("no_registered_exams_desc")}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRegister}
                  isLoading={isRegistering}
                  className="px-8 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
                >
                  {t("register_exam")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 mx-auto">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("confirmed_seats")}
              </div>
              <h2 className="text-xl font-bold text-white">{t("ready_to_start")}</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {t("student_hero_subtitle")}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/student/exams/${examId}/instructions`)}
                  className="px-8 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
                >
                  {t("accept_and_start")}
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : (
        /* Rendered Question Paper */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>
                <strong>Paper Generated Successfully!</strong> Randomized deterministic paper ready.
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-300">
              {paper.questions.length} Questions Loaded
            </span>
          </div>

          <div className="space-y-6">
            {paper.questions.map((q: StudentQuestion, idx: number) => {
              const isMulti = q.question_type === "MULTI_SELECT";
              const isMCQ = q.question_type === "MCQ";

              return (
                <Card key={q.id} className="space-y-4 border-slate-800 bg-[#0D1322]/90 shadow-xl">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {q.question_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={q.difficulty === "HARD" ? "rose" : q.difficulty === "MEDIUM" ? "amber" : "emerald"}>
                        {q.difficulty}
                      </Badge>
                      <Badge variant="indigo">{q.marks} pts</Badge>
                    </div>
                  </div>

                  <p className="text-base font-medium text-white leading-relaxed whitespace-pre-wrap">
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
                                ? "bg-indigo-600/15 border-indigo-500 text-white font-medium ring-1 ring-indigo-500/30"
                                : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/50 text-slate-300"
                            }`}
                          >
                            <input
                              type={isMulti ? "checkbox" : "radio"}
                              name={`question-${q.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded bg-slate-800 border-slate-700"
                            />
                            <span className="text-sm font-medium">{opt.option_text}</span>
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
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-900/80 text-white placeholder-slate-600 border rounded-xl border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Image Upload Question Type */}
                  {q.question_type === "IMAGE_UPLOAD" && (
                    <div className="pt-2 p-6 border-2 border-dashed rounded-xl border-slate-800 bg-slate-900/40 text-center space-y-2">
                      <p className="text-xs font-semibold text-slate-400">Diagram / Handwritten Solution Upload (PNG, JPEG, WEBP - Max 5MB)</p>
                      <p className="text-[11px] text-indigo-400">File upload and automated OCR pipeline enabled in exam attempt workspace.</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">
              Exam paper generated and bound to candidate ID. (Verification Mode)
            </span>
            <Button
              variant="primary"
              onClick={() => alert("Verification mode complete.")}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
            >
              Submit Verification
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
