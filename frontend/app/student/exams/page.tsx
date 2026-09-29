"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { Exam } from "@/types";
import { Card, Badge, Button, Alert, EmptyState, SearchInput, Tabs } from "@/components/UIComponents";
import { useLanguage } from "@/lib/i18n";
import {
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  Video,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Layers,
  Sparkles
} from "lucide-react";
import ToastContainer, { ToastMessage } from "@/components/Toast";

export default function StudentExamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "registered" | "available" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Exam[]>("/exams");
      setExams(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
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
      addToast("error", msg);
    } finally {
      setActionLoadingId(null);
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

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "registered") return exam.is_registered && !exam.is_completed;
    if (activeTab === "available") return !exam.is_registered && !exam.is_completed;
    if (activeTab === "completed") return exam.is_completed;
    return true;
  });

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t("my_exams_title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("my_exams_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExams}>
            {t("refresh")}
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs
            tabs={[
              { id: "all", label: t("all_exams"), count: exams.length },
              { id: "registered", label: t("registered_badge"), count: exams.filter((e) => e.is_registered && !e.is_completed).length },
              { id: "available", label: t("available_exams"), count: exams.filter((e) => !e.is_registered && !e.is_completed).length },
              { id: "completed", label: t("completed_exams"), count: exams.filter((e) => e.is_completed).length },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
          />
        </div>
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("search_exams_placeholder")}
          />
        </div>
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-56 flex items-center justify-center">
              <span className="text-xs text-slate-400">{t("loading")}</span>
            </Card>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <EmptyState
          title={t("no_exams_found")}
          description={t("no_exams_match_filter")}
          icon={Calendar}
          action={
            <Button variant="outline" size="sm" onClick={() => { setActiveTab("all"); setSearchQuery(""); }}>
              {t("reset_filters")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const windowStatus = getWindowStatus(exam.start_time, exam.end_time);
            return (
              <Card key={exam.id} className="flex flex-col justify-between hover:border-indigo-500/40 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={windowStatus.variant}>{t(windowStatus.labelKey)}</Badge>
                    <div className="flex items-center gap-1.5">
                      {exam.is_registered && <Badge variant="emerald">{t("registered_badge")}</Badge>}
                      {exam.is_completed && <Badge variant="indigo">{t("completed_exams")}</Badge>}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-indigo-400 transition-colors">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-indigo-400 font-medium mt-0.5">{exam.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-slate-200">{exam.duration_minutes} {t("minutes")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-slate-200">{exam.total_questions} {t("questions")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-slate-200">{exam.maximum_marks} {t("marks")}</span>
                    </div>
                    {exam.webcam_monitoring_enabled && (
                      <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                        <Video className="h-3.5 w-3.5" />
                        <span>{t("proctored")}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div>{t("start_window")} <span className="font-medium text-slate-200">{formatDateTime(exam.start_time)}</span></div>
                    <div>{t("end_window")} <span className="font-medium text-slate-200">{formatDateTime(exam.end_time)}</span></div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  {exam.is_completed ? (
                    <Link href={`/student/results?exam_id=${exam.id}`} className="block">
                      <Button variant="outline" size="sm" className="w-full">
                        {t("view_result")}
                      </Button>
                    </Link>
                  ) : !exam.is_registered ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      isLoading={actionLoadingId === exam.id}
                      onClick={() => handleRegister(exam.id)}
                      disabled={windowStatus.isClosed}
                    >
                      {t("register_exam")}
                    </Button>
                  ) : windowStatus.canStart ? (
                    <Link href={`/student/exams/${exam.id}/instructions`} className="block">
                      <Button variant="primary" size="sm" className="w-full gap-2">
                        <Play className="h-3.5 w-3.5" /> {t("start_exam")}
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      {windowStatus.isClosed ? t("closed") : t("upcoming")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
