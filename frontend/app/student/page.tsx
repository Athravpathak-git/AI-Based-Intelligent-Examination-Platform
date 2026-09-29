"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { Exam, ExamSubmissionResult } from "@/types";
import { Card, Badge, Button, Alert, StatCard, EmptyState, Tabs, SearchInput } from "@/components/UIComponents";
import { useLanguage } from "@/lib/i18n";
import {
  Clock,
  BookOpen,
  ArrowRight,
  Video,
  Hash,
  User as UserIcon,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  KeyRound
} from "lucide-react";
import ToastContainer, { ToastMessage } from "@/components/Toast";

interface StudentAnalytics {
  total_attempts: number;
  average_score: number;
  best_score: number;
  passed_exams: number;
  failed_exams: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [myResults, setMyResults] = useState<ExamSubmissionResult[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "available" | "registered" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [copiedReg, setCopiedReg] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [examsRes, resultsRes, analyticsRes] = await Promise.all([
        api.get<Exam[]>("/exams"),
        api.get<ExamSubmissionResult[]>("/results/my-results").catch(() => ({ data: [] })),
        api.get<StudentAnalytics>("/analytics/student").catch(() => ({ data: null })),
      ]);
      setExams(examsRes.data);
      setMyResults(resultsRes.data || []);
      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRegister = async (examId: number) => {
    setActionLoadingId(examId);
    try {
      await api.post(`/exams/${examId}/register`);
      addToast("success", t("exam_registered_toast"));
      setExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, is_registered: true } : e))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (err.response?.status === 409 || msg.toLowerCase().includes("already registered")) {
        addToast("info", t("already_registered_toast"));
        setExams((prev) =>
          prev.map((e) => (e.id === examId ? { ...e, is_registered: true } : e))
        );
      } else {
        addToast("error", msg);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyReg = () => {
    if (user?.registration_number) {
      navigator.clipboard.writeText(user.registration_number);
      setCopiedReg(true);
      setTimeout(() => setCopiedReg(false), 2000);
      addToast("info", t("reg_copied_toast"));
    }
  };

  const getWindowStatus = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) {
      return { labelKey: "upcoming", variant: "amber" as const, canStart: false, isClosed: false };
    }
    if (now > end) {
      return { labelKey: "closed", variant: "slate" as const, canStart: false, isClosed: true };
    }
    return { labelKey: "live_window", variant: "emerald" as const, canStart: true, isClosed: false };
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const uniqueSubjects = Array.from(new Set(exams.map((e) => e.subject))).filter(Boolean);
  const attemptedExamIds = new Set(myResults.map((r) => r.exam_id));

  const availableExams = exams.filter((e) => {
    if (e.has_active_reattempt) return true;
    const ws = getWindowStatus(e.start_time, e.end_time);
    return !ws.isClosed && !attemptedExamIds.has(e.id);
  });

  const upcomingExams = exams.filter((e) => {
    const ws = getWindowStatus(e.start_time, e.end_time);
    return ws.labelKey === "upcoming" && !e.has_active_reattempt;
  });

  const registeredExams = exams.filter((e) => e.is_registered || e.has_active_reattempt);

  const completedExams = exams.filter((e) => {
    const ws = getWindowStatus(e.start_time, e.end_time);
    return (ws.isClosed || attemptedExamIds.has(e.id)) && !e.has_active_reattempt;
  });

  let filteredByTab = exams;
  if (activeTab === "available") filteredByTab = availableExams;
  else if (activeTab === "registered") filteredByTab = registeredExams;
  else if (activeTab === "completed") filteredByTab = completedExams;

  const displayedExams = filteredByTab.filter((e) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === "" || e.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-8 py-2 max-w-7xl mx-auto animate-fade-in-up">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0D1322] via-[#131B2E] to-[#0D1322] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div
                onClick={handleCopyReg}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs font-mono font-semibold text-indigo-300 cursor-pointer hover:bg-slate-800 transition-colors shadow-xs"
                title={t("click_to_copy_reg")}
              >
                <Hash className="h-3 w-3 text-indigo-400" />
                <span>{user?.registration_number || "STU-2026-000005"}</span>
                {copiedReg ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-indigo-400" />}
              </div>
              <Badge variant="emerald">{t("verified_student")}</Badge>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {t("welcome_back")}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{user?.name}</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {t("student_hero_subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Link href="/student/profile" className="flex-1 lg:flex-none">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700 shadow-none gap-1.5"
              >
                <UserIcon className="h-3.5 w-3.5 text-indigo-400" /> {t("profile")}
              </Button>
            </Link>
            <Link href="/student/results" className="flex-1 lg:flex-none">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700 shadow-none gap-1.5"
              >
                <Award className="h-3.5 w-3.5 text-indigo-400" /> {t("results")}
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={fetchDashboardData}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title={t("available_exams")}
          value={availableExams.length}
          subtitle={t("open_for_testing")}
          icon={BookOpen}
          variant="burgundy"
        />
        <StatCard
          title={t("upcoming_exams")}
          value={upcomingExams.length}
          subtitle={t("scheduled_ahead")}
          icon={Calendar}
          variant="amber"
        />
        <StatCard
          title={t("registered_badge")}
          value={registeredExams.length}
          subtitle={t("confirmed_seats")}
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title={t("completed_exams")}
          value={analytics ? analytics.total_attempts : completedExams.length}
          subtitle={t("submitted_sessions")}
          icon={Award}
          variant="plum"
        />
        <StatCard
          title={t("total_marks")}
          value={analytics ? `${analytics.average_score.toFixed(1)}%` : "N/A"}
          subtitle={t("overall_performance")}
          icon={TrendingUp}
          variant="champagne"
        />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Tabs & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: "all", label: t("all_exams"), count: exams.length, icon: Layers },
              { id: "available", label: t("available_exams"), count: availableExams.length, icon: BookOpen },
              { id: "registered", label: t("registered_badge"), count: registeredExams.length, icon: CheckCircle2 },
              { id: "completed", label: t("completed_exams"), count: completedExams.length, icon: Award },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab)}
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t("search_exams_placeholder")}
              />
            </div>

            {uniqueSubjects.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-[#0D1322] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-100 font-medium"
              >
                <option value="" className="bg-[#0D1322]">{t("all_subjects")}</option>
                {uniqueSubjects.map((s) => (
                  <option key={s} value={s} className="bg-[#0D1322]">
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      ) : displayedExams.length === 0 ? (
        <EmptyState
          title={t("no_exams_found")}
          description={
            searchQuery || subjectFilter
              ? t("no_exams_match_filter")
              : activeTab === "registered"
              ? t("no_registered_exams_desc")
              : activeTab === "completed"
              ? t("no_completed_exams_desc")
              : t("no_exams_scheduled")
          }
          icon={BookOpen}
          action={
            (searchQuery || subjectFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSubjectFilter("");
                }}
              >
                {t("reset_filters")}
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedExams.map((exam) => {
            const windowStatus = getWindowStatus(exam.start_time, exam.end_time);
            const isAttempted = attemptedExamIds.has(exam.id);
            const isReg = Boolean(exam.is_registered);

            return (
              <div
                key={exam.id}
                className="bg-[#0D1322]/90 rounded-2xl border border-slate-800/80 shadow-xl hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header & Content */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      {exam.subject}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {exam.webcam_monitoring_enabled && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                          title="Webcam proctoring enabled"
                        >
                          <Video className="h-3 w-3 text-cyan-400" />
                          {t("proctored")}
                        </span>
                      )}
                      <Badge variant={windowStatus.variant}>
                        {t(windowStatus.labelKey)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white hover:text-indigo-400 transition-colors line-clamp-1">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {t("exam_id")}: #{exam.id}
                    </p>
                  </div>

                  {/* Core Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">{t("questions")}</span>
                      <span className="text-sm font-extrabold text-white font-mono">
                        {exam.total_questions}
                      </span>
                    </div>

                    <div className="border-x border-slate-800">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">{t("duration")}</span>
                      <span className="text-sm font-extrabold text-white font-mono">
                        {exam.duration_minutes}m
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">{t("total_marks")}</span>
                      <span className="text-sm font-extrabold text-indigo-400 font-mono">
                        {exam.maximum_marks}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="space-y-1 text-xs text-slate-400 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{t("start_window")}</span>
                      <span className="font-medium text-slate-200">{formatDateTime(exam.start_time)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{t("end_window")}</span>
                      <span className="font-medium text-slate-200">{formatDateTime(exam.end_time)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {isReg ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("registered_badge")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">{t("not_registered")}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAttempted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/student/results?exam_id=${exam.id}`)}
                      >
                        <Award className="h-3.5 w-3.5 mr-1 text-indigo-400" /> {t("view_result")}
                      </Button>
                    ) : !isReg && !windowStatus.isClosed ? (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={actionLoadingId === exam.id}
                        onClick={() => handleRegister(exam.id)}
                      >
                        {t("register_exam")}
                      </Button>
                    ) : isReg && (windowStatus.canStart || exam.can_start) ? (
                      <Button
                        variant="success"
                        size="sm"
                        className="font-bold shadow-xs"
                        onClick={() => router.push(`/student/exams/${exam.id}/instructions`)}
                      >
                        <Play className="h-3 w-3 mr-1 fill-current" /> {t("start_exam")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/student/exams/${exam.id}`)}
                      >
                        {t("details")} <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
