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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E06A26]"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4">
        <Alert type="error">{error || "Examination parameters could not be loaded."}</Alert>
        <Link href="/student">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const maxWarnings = exam.maximum_tab_switch_warnings ?? 3;

  const rulesList = [
    "The examination must be taken in a quiet, well-lit private room without unauthorized individuals present.",
    "Fullscreen mode is mandatory and will be automatically engaged upon beginning the examination attempt.",
    "Leaving fullscreen or switching browser tabs/windows will immediately trigger an authoritative security violation event.",
    `If security violations exceed the maximum allowed threshold (${maxWarnings} warnings), the assessment will be automatically submitted immediately without appeal.`,
    "Do not use shortcut combinations such as Alt+Tab, Cmd+Tab, Ctrl+T, Ctrl+N, Ctrl+W, or inspect browser developer tools (F12).",
    "Automated proctoring models continuously verify candidate presence, webcam visibility, and detect auxiliary electronic devices.",
    "Ensure your webcam and audio capture permissions remain active for the entire duration of the session.",
    "The examination timer is strictly server-authoritative. The countdown starts upon entering the examination environment and will not pause on browser reload.",
    "When the authoritative countdown reaches 00:00:00, all recorded responses are automatically locked, evaluated, and graded.",
    "All candidate question responses and selections are synchronized with the PostgreSQL backend in real-time.",
    "You can navigate freely between questions using the Question Palette and flag ambiguous questions for later review.",
    "Each question is evaluated based on the authoritative scoring scheme configured for this examination.",
    exam.negative_marking_enabled
      ? `Negative marking is ACTIVE: incorrect submissions will incur a deduction of ${exam.negative_mark_value || 0.25} marks.`
      : "Negative marking is DISABLED for this examination: no penalty points are deducted for incorrect responses.",
    "Any attempt to tamper with security listeners, spoof network packets, or manipulate local storage will result in immediate disqualification.",
    "By checking the acknowledgments and proceeding, you certify under institutional honor code that all submitted answers are solely your own work."
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="text-xs font-semibold text-[#6B6B76] hover:text-[#1C1C1F] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Cancel & Return to Dashboard
        </Link>
        <Badge variant="saffron">Official Candidate Instructions</Badge>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Exam Parameters Overview Card */}
      <div className="p-6 bg-gradient-to-br from-[#1C1C1F] via-[#242428] to-[#171719] text-white border border-[#2F2F36] rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="text-xs font-bold text-[#E06A26] uppercase tracking-wider mb-1">
              {exam.subject}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{exam.name}</h1>
            <p className="text-xs text-[#FAF8F5]/70 mt-1">
              Exam ID #{exam.id} &bull; Window: {new Date(exam.start_time).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-white/10 text-[#FAF8F5] border border-white/20 text-xs font-bold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#E06A26]" /> Secure Proctored Session
            </span>
          </div>
        </div>

        {/* Dynamic Parameter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] uppercase font-bold text-[#FAF8F5]/60 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-[#E06A26]" /> {t("duration")}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{exam.duration_minutes} {t("minutes")}</div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] uppercase font-bold text-[#FAF8F5]/60 flex items-center justify-center gap-1">
              <BookOpen className="h-3 w-3 text-[#E06A26]" /> {t("questions")}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{exam.total_questions} Qs</div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] uppercase font-bold text-[#FAF8F5]/60 flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-[#E06A26]" /> {t("total_marks")}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{exam.maximum_marks} pts</div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] uppercase font-bold text-[#FAF8F5]/60 flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-[#D97706]" /> Passing Marks
            </div>
            <div className="text-xl font-black text-[#D97706] mt-0.5">
              {exam.passing_marks ?? Math.round(exam.maximum_marks * 0.4)} pts
            </div>
          </div>
        </div>

        {/* Dynamic Security & Proctoring Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="bg-white/5 px-3 py-2 rounded-lg border border-white/10 flex items-center justify-between">
            <span className="text-[#FAF8F5]/70">Negative Marking:</span>
            <span className={`font-bold ${exam.negative_marking_enabled ? "text-[#C85332]" : "text-[#2B7853]"}`}>
              {exam.negative_marking_enabled ? `Active (-${exam.negative_mark_value || 0.25})` : "Disabled"}
            </span>
          </div>

          <div className="bg-white/5 px-3 py-2 rounded-lg border border-white/10 flex items-center justify-between">
            <span className="text-[#FAF8F5]/70">Max Violations:</span>
            <span className="font-bold text-[#D97706]">{maxWarnings} warnings</span>
          </div>

          <div className="bg-white/5 px-3 py-2 rounded-lg border border-white/10 flex items-center justify-between">
            <span className="text-[#FAF8F5]/70">Webcam Proctoring:</span>
            <span className={`font-bold ${exam.webcam_monitoring_enabled ? "text-white" : "text-[#FAF8F5]/70"}`}>
              {exam.webcam_monitoring_enabled ? "Enforced" : "Optional"}
            </span>
          </div>
        </div>
      </div>

      {/* 15 Formal Rules Section */}
      <Card className="p-6 space-y-4 border-[#EAE6DF] bg-white">
        <div className="flex items-center gap-2 border-b border-[#EAE6DF] pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#FEF3EC] text-[#E06A26] flex items-center justify-center font-bold">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1C1F]">Examination Code of Conduct & Rules</h2>
            <p className="text-xs text-[#6B6B76]">Read all 15 rules carefully before confirming your acknowledgment.</p>
          </div>
        </div>

        <ol className="space-y-2.5 text-xs text-[#6B6B76] list-decimal list-inside pl-1">
          {rulesList.map((rule, idx) => (
            <li key={idx} className="leading-relaxed pl-1 py-0.5">
              <span className="font-medium text-[#1C1C1F]">{rule}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Mandatory Checkboxes & Acceptance Card */}
      <Card className="p-6 space-y-5 border-[#EAE6DF] bg-white shadow-card">
        <div className="flex items-center gap-2 text-[#E06A26] font-bold text-sm">
          <ShieldAlert className="h-5 w-5 text-[#E06A26]" />
          <span>Candidate Mandatory Acknowledgments</span>
        </div>

        <div className="space-y-3 pt-1">
          {/* Checkbox 1 */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              checkSystem
                ? "bg-[#FAF8F5] border-[#E06A26] shadow-xs text-[#1C1C1F]"
                : "bg-white border-[#EAE6DF] text-[#6B6B76] hover:bg-[#FAF8F5]"
            }`}
          >
            <input
              type="checkbox"
              checked={checkSystem}
              onChange={(e) => setCheckSystem(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#E06A26] focus:ring-[#E06A26] rounded cursor-pointer"
            />
            <span className="text-xs font-semibold leading-snug">
              1. I have verified my system requirements, webcam operation, and internet connectivity stability.
            </span>
          </label>

          {/* Checkbox 2 */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              checkProctoring
                ? "bg-[#FAF8F5] border-[#E06A26] shadow-xs text-[#1C1C1F]"
                : "bg-white border-[#EAE6DF] text-[#6B6B76] hover:bg-[#FAF8F5]"
            }`}
          >
            <input
              type="checkbox"
              checked={checkProctoring}
              onChange={(e) => setCheckProctoring(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#E06A26] focus:ring-[#E06A26] rounded cursor-pointer"
            />
            <span className="text-xs font-semibold leading-snug">
              2. I agree to automated proctoring monitoring including webcam feed analysis, fullscreen enforcement, and tab-switch detection throughout the examination.
            </span>
          </label>

          {/* Checkbox 3 */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              checkAutoSubmit
                ? "bg-[#FAF8F5] border-[#E06A26] shadow-xs text-[#1C1C1F]"
                : "bg-white border-[#EAE6DF] text-[#6B6B76] hover:bg-[#FAF8F5]"
            }`}
          >
            <input
              type="checkbox"
              checked={checkAutoSubmit}
              onChange={(e) => setCheckAutoSubmit(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#E06A26] focus:ring-[#E06A26] rounded cursor-pointer"
            />
            <span className="text-xs font-semibold leading-snug">
              3. I understand that exceeding violation limits ({maxWarnings} warnings) or closing the examination window will result in immediate automatic submission and permanent record.
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-[#EAE6DF] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs">
            {allChecked ? (
              <span className="text-[#2B7853] font-bold flex items-center gap-1">
                ✓ All acknowledgments accepted. You may now launch the examination.
              </span>
            ) : (
              <span className="text-[#D97706] font-medium">
                Please check all three acknowledgments above to proceed.
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
            className="font-bold shadow-saffron/20 uppercase tracking-wider"
          >
            <Play className="h-4 w-4 mr-2" /> {t("accept_and_start")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
