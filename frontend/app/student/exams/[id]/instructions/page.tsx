"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Exam } from "@/types";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import {
  ShieldAlert,
  Clock,
  BookOpen,
  Award,
  Video,
  MonitorOff,
  AlertTriangle,
  CheckSquare,
  Square,
  ArrowLeft,
  Play,
  FileText,
  Lock
} from "lucide-react";

export default function ExamInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const { t } = useLanguage();

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3 Mandatory Checkboxes
  const [checkSystem, setCheckSystem] = useState(false);
  const [checkProctoring, setCheckProctoring] = useState(false);
  const [checkAutoSubmit, setCheckAutoSubmit] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<Exam>(`/exams/${examId}`);
        setExam(res.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const allChecked = checkSystem && checkProctoring && checkAutoSubmit;

  const handleAcceptAndStart = async () => {
    if (!allChecked) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Authoritative audit log of instruction acceptance
      await api.post(`/exams/${examId}/accept-instructions`, { accepted: true });
      // Route to real fullscreen proctored attempt
      router.push(`/student/exams/${examId}/attempt`);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C5A04A]"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4">
        <Alert type="error">{error || "Examination parameters could not be loaded."}</Alert>
        <Link href="/student">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("cancel_return_dashboard")}
          </Button>
        </Link>
      </div>
    );
  }

  const maxWarnings = exam.maximum_tab_switch_warnings ?? 3;

  const rulesList = [
    t("rule_1"),
    t("rule_2"),
    t("rule_3"),
    t("rule_4"),
    t("fullscreen_mandatory_rule"),
    t("fullscreen_warning_rule"),
    exam.negative_marking_enabled
      ? `${t("negative_marking")}: -${exam.negative_mark_value || 0.25} ${t("marks")}`
      : `${t("negative_marking")}: ${t("disabled_status")}`
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("cancel_return_dashboard")}
        </Link>
        <Badge variant="indigo">{t("official_instructions_badge")}</Badge>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Exam Parameters Overview Card */}
      <div className="p-6 bg-gradient-to-br from-[#0D1322] via-[#131B2E] to-[#0D1322] text-white border border-slate-800 rounded-3xl shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
              {exam.subject}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{exam.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {t("exam_id")} #{exam.id} &bull; Window: {new Date(exam.start_time).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs font-bold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-indigo-400" /> {t("secure_proctored_session")}
            </span>
          </div>
        </div>

        {/* Dynamic Parameter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-indigo-400" /> {t("duration")}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{exam.duration_minutes} {t("minutes")}</div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <BookOpen className="h-3 w-3 text-indigo-400" /> {t("questions")}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{exam.total_questions} Qs</div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-indigo-400" /> {t("total_marks")}
            </div>
            <div className="text-xl font-black text-indigo-400 mt-0.5">{exam.maximum_marks} pts</div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-amber-400" /> {t("passing_marks")}
            </div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {exam.passing_marks ?? Math.round(exam.maximum_marks * 0.4)} pts
            </div>
          </div>
        </div>

        {/* Dynamic Security & Proctoring Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t("negative_marking")}:</span>
            <span className={`font-bold ${exam.negative_marking_enabled ? "text-rose-400" : "text-emerald-400"}`}>
              {exam.negative_marking_enabled ? `${t("active_status")} (-${exam.negative_mark_value || 0.25})` : t("disabled_status")}
            </span>
          </div>

          <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t("max_violations")}:</span>
            <span className="font-bold text-amber-400">{maxWarnings} {t("warnings_count")}</span>
          </div>

          <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t("webcam_proctoring")}:</span>
            <span className={`font-bold ${exam.webcam_monitoring_enabled ? "text-cyan-400" : "text-slate-500"}`}>
              {exam.webcam_monitoring_enabled ? t("enforced") : t("optional")}
            </span>
          </div>
        </div>
      </div>

      {/* 15 Formal Rules Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t("code_of_conduct_title")}</h2>
            <p className="text-xs text-slate-400">{t("code_of_conduct_subtitle")}</p>
          </div>
        </div>

        <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside pl-1">
          {rulesList.map((rule, idx) => (
            <li key={idx} className="leading-relaxed pl-1 py-0.5">
              <span className="font-medium text-slate-200">{rule}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Mandatory Checkboxes & Acceptance Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <ShieldAlert className="h-5 w-5 text-indigo-400" />
          <span>{t("mandatory_acknowledgments")}</span>
        </div>

        <div className="space-y-3 pt-1">
          {/* Checkbox 1 */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              checkSystem
                ? "bg-indigo-950/20 border-indigo-500/40 text-white"
                : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <input
              type="checkbox"
              checked={checkSystem}
              onChange={(e) => setCheckSystem(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
            <span className="text-xs font-semibold leading-snug">
              {t("ack_check_1")}
            </span>
          </label>

          {/* Checkbox 2 */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              checkProctoring
                ? "bg-indigo-950/20 border-indigo-500/40 text-white"
                : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <input
              type="checkbox"
              checked={checkProctoring}
              onChange={(e) => setCheckProctoring(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
            <span className="text-xs font-semibold leading-snug">
              {t("ack_check_2")}
            </span>
          </label>

          {/* Checkbox 3 */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              checkAutoSubmit
                ? "bg-indigo-950/20 border-indigo-500/40 text-white"
                : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <input
              type="checkbox"
              checked={checkAutoSubmit}
              onChange={(e) => setCheckAutoSubmit(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
            <span className="text-xs font-semibold leading-snug">
              {t("ack_check_3")}
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs">
            {allChecked ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                {t("all_acks_accepted")}
              </span>
            ) : (
              <span className="text-amber-400 font-medium">
                {t("please_check_all_acks")}
              </span>
            )}
          </div>

          <Button
            type="button"
            disabled={!allChecked || isSubmitting}
            isLoading={isSubmitting}
            onClick={handleAcceptAndStart}
            variant={allChecked ? "primary" : "outline"}
            size="lg"
            className="font-bold uppercase tracking-wider"
          >
            <Play className="h-4 w-4 mr-2" /> {t("accept_and_start")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
