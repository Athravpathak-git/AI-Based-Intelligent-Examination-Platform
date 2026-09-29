"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Badge, Button, StatCard } from "@/components/UIComponents";
import {
  Shield,
  Users,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Activity,
  ArrowRight,
  UserCheck,
  FileSpreadsheet,
  Award,
  AlertTriangle,
  Clock,
  Plus,
  Eye,
  Camera
} from "lucide-react";

interface AdminAnalytics {
  total_students: number;
  total_examiners: number;
  total_admins: number;
  total_exams: number;
  active_exams: number;
  completed_exams: number;
  total_questions: number;
  total_attempts: number;
  global_average: number;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);
  const [readyPublishCount, setReadyPublishCount] = useState<number>(0);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeCandidatesCount, setActiveCandidatesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, evalRes, monRes] = await Promise.all([
          api.get<AdminAnalytics>("/analytics/admin"),
          api.get<any[]>("/evaluations/pending").catch(() => ({ data: [] })),
          api.get<any>("/monitoring/live").catch(() => ({ data: { sessions: [], total_active_candidates: 0 } }))
        ]);
        setAnalytics(aRes.data);
        if (Array.isArray(evalRes.data)) {
          setPendingEvalCount(evalRes.data.filter((i) => i.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION" || i.evaluation_status === "EVALUATION_IN_PROGRESS").length);
          setReadyPublishCount(evalRes.data.filter((i) => i.evaluation_status === "READY_FOR_PUBLICATION").length);
        }
        if (monRes?.data) {
          setLiveSessions(monRes.data.sessions || []);
          setActiveCandidatesCount(monRes.data.total_active_candidates || 0);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-sm">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("admin_command_center")}</h1>
              <Badge variant="indigo">{t("tier1_authority")}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t("admin_hero_desc")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/admin/candidates">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
              <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-400" /> {t("candidate_rosters")}
            </Button>
          </Link>
          <Link href="/admin/evaluations">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs font-bold shadow-md shadow-indigo-500/20">
              <Award className="h-3.5 w-3.5 text-white" /> {t("valuation_declaration")}
              {pendingEvalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#080C14] text-indigo-300 border border-indigo-500/40">
                  {pendingEvalCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/admin/monitoring">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold">
              <Eye className="h-3.5 w-3.5 text-indigo-400" /> {t("live_monitoring")}
              {activeCandidatesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  {activeCandidatesCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold">
              <Users className="h-3.5 w-3.5 text-slate-400" /> {t("user_directory")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Proctoring Surveillance Section */}
      <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{t("live_monitoring_overview")}</h2>
                {activeCandidatesCount > 0 ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {activeCandidatesCount} {t("active_candidates_count")}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium">
                    {t("systems_operational")}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t("monitoring_subtitle")}</p>
            </div>
          </div>

          <Link href="/admin/monitoring">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-800 font-semibold text-indigo-400 hover:text-white hover:bg-slate-800/60">
              <Eye className="h-3.5 w-3.5" /> {t("view_all_monitoring")} &rarr;
            </Button>
          </Link>
        </div>

        {liveSessions.length === 0 ? (
          <div className="py-6 px-4 text-center bg-[#080C14]/40 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>{t("no_active_sessions_now")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {liveSessions.slice(0, 3).map((sess) => (
              <div
                key={sess.session_id}
                className="p-3.5 rounded-xl border border-slate-800 bg-[#080C14]/60 hover:bg-[#080C14] hover:border-indigo-500/40 transition-all space-y-2 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white truncate">{sess.student_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sess.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {sess.status === "ACTIVE" ? t("status_active") : t("status_completed")}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="truncate">{sess.exam_name}</span>
                  <span className="font-mono font-bold text-cyan-400">{formatSeconds(sess.remaining_seconds)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                  <span className={`inline-flex items-center gap-1 font-semibold ${
                    sess.camera_active ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    <Camera className="h-3 w-3" />
                    {sess.camera_active ? t("camera_available") : t("camera_unavailable")}
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className={`inline-flex items-center gap-1 ${
                    sess.total_violations > 0 ? "text-amber-400 font-bold" : "text-slate-400"
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                    {sess.total_violations} {t("security_events")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Valuation Attention Banner */}
      {(pendingEvalCount > 0 || readyPublishCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {pendingEvalCount > 0
                  ? `${pendingEvalCount} ${t("admin_eval_pending_title")}`
                  : `${readyPublishCount} ${t("admin_eval_ready_title")}`}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("admin_eval_desc")}
              </p>
            </div>
          </div>
          <Link href="/admin/evaluations">
            <Button variant="primary" size="sm" className="w-full sm:w-auto font-bold gap-1.5 shadow-md shadow-indigo-500/20">
              {t("launch_valuation_workspace")} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Institutional Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("enrolled_students")}</span>
            <UserCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {isLoading ? "..." : analytics?.total_students ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">{t("unique_registered_candidates")}</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("faculty_examiners")}</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {isLoading ? "..." : analytics?.total_examiners ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">{t("accredited_course_creators")}</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("active_assessments")}</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {isLoading ? "..." : analytics?.active_exams ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">{t("currently_live_windows")}</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("completed_sessions")}</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {isLoading ? "..." : analytics?.completed_exams ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">{t("graded_attempt_transcripts")}</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("pending_valuations")}</span>
            <Award className="h-4 w-4 text-indigo-400" />
          </div>
          <div className={`text-2xl font-black font-mono ${pendingEvalCount > 0 ? "text-indigo-400" : "text-white"}`}>
            {isLoading ? "..." : pendingEvalCount}
          </div>
          <p className="text-[11px] text-slate-400">{t("assessments_awaiting_valuation")}</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t("institution_average")}</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {isLoading ? "..." : `${Math.round(analytics?.global_average ?? 0)}%`}
          </div>
          <p className="text-[11px] text-slate-400">{t("global_candidate_percentile")}</p>
        </div>
      </div>

      {/* Quick Access Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4 hover:shadow-xl hover:border-indigo-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t("platform_valuation_results")}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("platform_valuation_desc")}
              </p>
            </div>
          </div>
          <Link href="/admin/evaluations">
            <Button variant="outline" className="w-full text-xs justify-between border-slate-800 text-indigo-300 hover:text-white hover:bg-slate-800/60">
              {t("open_valuation_pending")} ({pendingEvalCount} {t("pending_admin_approval")}) <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="p-6 space-y-4 hover:shadow-xl hover:border-cyan-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t("candidate_rosters_audit")}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("candidate_rosters_desc")}
              </p>
            </div>
          </div>
          <Link href="/admin/candidates">
            <Button variant="outline" className="w-full text-xs justify-between border-slate-800 text-cyan-300 hover:text-white hover:bg-slate-800/60">
              {t("open_candidate_directory")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="p-6 space-y-4 hover:shadow-xl hover:border-indigo-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t("identity_role_management")}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("identity_role_desc")}
              </p>
            </div>
          </div>
          <Link href="/admin/users">
            <Button variant="outline" className="w-full text-xs justify-between border-slate-800 text-indigo-300 hover:text-white hover:bg-slate-800/60">
              {t("manage_platform_users")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Operational Overview */}
      <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">{t("institutional_exam_registry")}</h2>
            <p className="text-xs text-slate-400">{t("repository_scale_desc")}</p>
          </div>
          <Link href="/admin/exams">
            <Button variant="primary" size="sm" className="text-xs gap-1.5 font-bold shadow-md shadow-indigo-500/20">
              <Plus className="h-3.5 w-3.5" /> {t("configure_assessment")}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-[#080C14]/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("configured_assessments")}</span>
            <div className="text-2xl font-extrabold text-white font-mono">{analytics?.total_exams ?? 0}</div>
            <p className="text-[11px] text-slate-400">{t("total_institutional_papers")}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#080C14]/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("curated_question_repo")}</span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {analytics?.total_questions ? analytics.total_questions.toLocaleString() : 0}
            </div>
            <p className="text-[11px] text-slate-400">{t("multidomain_verified_items")}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#080C14]/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("total_evaluated_attempts")}</span>
            <div className="text-2xl font-extrabold text-white font-mono">{analytics?.total_attempts ?? 0}</div>
            <p className="text-[11px] text-slate-400">{t("historical_candidate_submissions")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
