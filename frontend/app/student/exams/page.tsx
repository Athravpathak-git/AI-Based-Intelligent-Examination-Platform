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
      addToast("success", "Successfully registered for exam!");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE6DF]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1C1C1F] tracking-tight">
            My Assessments & Scheduled Exams
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B76] mt-1">
            Access your registered examinations, review schedules, and take AI-proctored tests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExams}>
            Refresh Schedules
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs
            tabs={[
              { id: "all", label: "All Exams", count: exams.length },
              { id: "registered", label: "Registered", count: exams.filter((e) => e.is_registered && !e.is_completed).length },
              { id: "available", label: "Available", count: exams.filter((e) => !e.is_registered && !e.is_completed).length },
              { id: "completed", label: "Completed", count: exams.filter((e) => e.is_completed).length },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
          />
        </div>
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by exam name or subject..."
          />
        </div>
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-56 bg-white flex items-center justify-center">
              <span className="text-xs text-[#6B6B76]">Loading examination details...</span>
            </Card>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <EmptyState
          title="No Examinations Found"
          description="There are currently no examinations matching your selected filter criteria."
          icon={Calendar}
          action={
            <Button variant="outline" size="sm" onClick={() => { setActiveTab("all"); setSearchQuery(""); }}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const windowStatus = getWindowStatus(exam.start_time, exam.end_time);
            return (
              <Card key={exam.id} className="flex flex-col justify-between hover:border-[#E06A26]/50 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={windowStatus.variant}>{windowStatus.label}</Badge>
                    <div className="flex items-center gap-1.5">
                      {exam.is_registered && <Badge variant="saffron">Registered</Badge>}
                      {exam.is_completed && <Badge variant="emerald">Completed</Badge>}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-[#1C1C1F] group-hover:text-[#E06A26] transition-colors">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-[#6B6B76] font-medium mt-0.5">{exam.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#EAE6DF] text-xs">
                    <div className="flex items-center gap-1.5 text-[#6B6B76]">
                      <Clock className="h-3.5 w-3.5 text-[#E06A26]" />
                      <span>{exam.duration_minutes} Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#6B6B76]">
                      <FileText className="h-3.5 w-3.5 text-[#E06A26]" />
                      <span>{exam.total_questions} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#6B6B76]">
                      <Sparkles className="h-3.5 w-3.5 text-[#E06A26]" />
                      <span>{exam.maximum_marks} Marks</span>
                    </div>
                    {exam.webcam_monitoring_enabled && (
                      <div className="flex items-center gap-1.5 text-[#2B7853] font-semibold">
                        <Video className="h-3.5 w-3.5" />
                        <span>AI Proctoring</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-[#6B6B76]">
                    <div>Start: <span className="font-medium text-[#1C1C1F]">{formatDateTime(exam.start_time)}</span></div>
                    <div>End: <span className="font-medium text-[#1C1C1F]">{formatDateTime(exam.end_time)}</span></div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  {exam.is_completed ? (
                    <Link href={`/student/results?exam_id=${exam.id}`} className="block">
                      <Button variant="outline" size="sm" className="w-full">
                        View Assessment Result
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
                      Register for Exam
                    </Button>
                  ) : windowStatus.canStart ? (
                    <Link href={`/student/exams/${exam.id}/instructions`} className="block">
                      <Button variant="saffron" size="sm" className="w-full gap-2">
                        <Play className="h-3.5 w-3.5" /> Enter Examination
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      {windowStatus.isClosed ? "Exam Window Closed" : "Exam Not Started Yet"}
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
