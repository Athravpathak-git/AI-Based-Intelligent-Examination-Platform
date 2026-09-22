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
      addToast("success", "Successfully registered for exam! Seat confirmed.");
      setExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, is_registered: true } : e))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (err.response?.status === 409 || msg.toLowerCase().includes("already registered")) {
        addToast("info", "You are already registered for this exam.");
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
      addToast("info", "Registration number copied to clipboard.");
    }
  };

  const getWindowStatus = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) {
      return { label: "Upcoming", variant: "amber" as const, canStart: false, isClosed: false };
    }
    if (now > end) {
      return { label: "Closed", variant: "slate" as const, canStart: false, isClosed: true };
    }
    return { label: "Live Window", variant: "emerald" as const, canStart: true, isClosed: false };
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
    return ws.label === "Upcoming" && !e.has_active_reattempt;
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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#171719] via-[#242428] to-[#1C1C1F] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-[#2F2F36]">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-[#E06A26]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div
                onClick={handleCopyReg}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono font-semibold text-[#FAF8F5] cursor-pointer hover:bg-white/15 transition-colors"
                title="Click to copy registration number"
              >
                <Hash className="h-3 w-3 text-[#E06A26]" />
                <span>{user?.registration_number || "STU-2026-000005"}</span>
                {copiedReg ? <Check className="h-3 w-3 text-[#2B7853]" /> : <Copy className="h-3 w-3 text-[#E06A26]" />}
              </div>
              <Badge variant="emerald">Verified Student</Badge>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {t("welcome_back")}, <span className="text-[#E06A26]">{user?.name}</span>
            </h1>
            <p className="text-[#FAF8F5]/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Access your scheduled assessments, take AI-proctored examinations, and view official transcripts and performance diagnosis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Link href="/student/profile" className="flex-1 lg:flex-none">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none gap-1.5"
              >
                <UserIcon className="h-3.5 w-3.5 text-[#E06A26]" /> {t("profile")}
              </Button>
            </Link>
            <Link href="/student/results" className="flex-1 lg:flex-none">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none gap-1.5"
              >
                <Award className="h-3.5 w-3.5 text-[#E06A26]" /> {t("results")}
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={fetchDashboardData}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title={t("available_exams")}
          value={availableExams.length}
          subtitle="Open for testing"
          icon={BookOpen}
          variant="burgundy"
        />
        <StatCard
          title={t("upcoming_exams")}
          value={upcomingExams.length}
          subtitle="Scheduled ahead"
          icon={Calendar}
          variant="amber"
        />
        <StatCard
          title={t("registered_badge")}
          value={registeredExams.length}
          subtitle="Confirmed seats"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title={t("completed_exams")}
          value={analytics ? analytics.total_attempts : completedExams.length}
          subtitle="Submitted sessions"
          icon={Award}
          variant="plum"
        />
        <StatCard
          title={t("total_marks")}
          value={analytics ? `${analytics.average_score.toFixed(1)}%` : "N/A"}
          subtitle="Overall performance"
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
                placeholder="Search exams or subject..."
              />
            </div>

            {uniqueSubjects.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-[#EAE6DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E06A26]/20 text-[#1C1C1F] font-medium"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map((s) => (
                  <option key={s} value={s}>
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E06A26]"></div>
        </div>
      ) : displayedExams.length === 0 ? (
        <EmptyState
          title="No examinations found"
          description={
            searchQuery || subjectFilter
              ? "No assessments match your current search and filter criteria. Try adjusting your query."
              : activeTab === "registered"
              ? "You have not registered for any upcoming examinations yet. Explore available examinations above to register."
              : activeTab === "completed"
              ? "No completed examinations in your record. Once you submit assessments, your results and scores will appear here."
              : "There are currently no examinations scheduled in the system."
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
                Reset Search Filters
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
                className="bg-white rounded-2xl border border-[#EAE6DF] shadow-card hover:shadow-card-hover hover:border-[#E06A26]/40 transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header & Content */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]">
                      {exam.subject}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {exam.webcam_monitoring_enabled && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#6B6B76] border border-[#EAE6DF]"
                          title="Webcam proctoring enabled"
                        >
                          <Video className="h-3 w-3 text-[#E06A26]" />
                          Proctored
                        </span>
                      )}
                      <Badge variant={windowStatus.variant}>
                        {windowStatus.label}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#1C1C1F] hover:text-[#E06A26] transition-colors line-clamp-1">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-[#6B6B76] mt-0.5 font-mono">
                      Exam ID: #{exam.id}
                    </p>
                  </div>

                  {/* Core Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] text-center">
                    <div>
                      <span className="block text-[10px] text-[#6B6B76] font-semibold uppercase">{t("questions")}</span>
                      <span className="text-sm font-extrabold text-[#1C1C1F] font-mono">
                        {exam.total_questions}
                      </span>
                    </div>

                    <div className="border-x border-[#EAE6DF]">
                      <span className="block text-[10px] text-[#6B6B76] font-semibold uppercase">{t("duration")}</span>
                      <span className="text-sm font-extrabold text-[#1C1C1F] font-mono">
                        {exam.duration_minutes}m
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-[#6B6B76] font-semibold uppercase">{t("total_marks")}</span>
                      <span className="text-sm font-extrabold text-[#E06A26] font-mono">
                        {exam.maximum_marks}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="space-y-1 text-xs text-[#6B6B76] pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6B6B76]">Start Window:</span>
                      <span className="font-medium text-[#1C1C1F]">{formatDateTime(exam.start_time)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6B6B76]">End Window:</span>
                      <span className="font-medium text-[#1C1C1F]">{formatDateTime(exam.end_time)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-[#FAF8F5]/80 border-t border-[#EAE6DF] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {isReg ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2B7853] bg-[#EFF7F2] px-2 py-0.5 rounded-full border border-[#C4DFD3]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("registered_badge")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#6B6B76] font-medium">Not Registered</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAttempted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/student/results?exam_id=${exam.id}`)}
                      >
                        <Award className="h-3.5 w-3.5 mr-1 text-[#E06A26]" /> {t("view_result")}
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
                        Details <ArrowRight className="h-3 w-3 ml-1" />
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
