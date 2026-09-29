"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Button, Badge, StatCard } from "@/components/UIComponents";
import {
  BookOpen,
  Layers,
  Users,
  TrendingUp,
  Award,
  ArrowRight,
  Clock,
  Eye,
  Camera,
  Shield,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Maximize2
} from "lucide-react";

interface ExaminerAnalytics {
  total_exams: number;
  active_exams: number;
  upcoming_exams: number;
  completed_exams: number;
  total_questions: number;
  registered_candidates: number;
  average_performance: number;
  highest_score: number;
  lowest_score: number;
  total_evaluations: number;
}

export default function ExaminerDashboard() {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<ExaminerAnalytics | null>(null);
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);
  const [readyPublishCount, setReadyPublishCount] = useState<number>(0);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeCandidatesCount, setActiveCandidatesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [res, pendingRes, monRes] = await Promise.all([
          api.get<ExaminerAnalytics>("/analytics/examiner"),
          api.get<any[]>("/evaluations/pending").catch(() => ({ data: [] })),
          api.get<any>("/monitoring/live").catch(() => ({ data: { sessions: [], total_active_candidates: 0 } }))
        ]);
        setAnalytics(res.data);
        if (Array.isArray(pendingRes.data)) {
          setPendingEvalCount(pendingRes.data.filter((i) => i.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION" || i.evaluation_status === "EVALUATION_IN_PROGRESS").length);
          setReadyPublishCount(pendingRes.data.filter((i) => i.evaluation_status === "READY_FOR_PUBLICATION").length);
        }
        if (monRes?.data) {
          setLiveSessions(monRes.data.sessions || []);
          setActiveCandidatesCount(monRes.data.total_active_candidates || 0);
        }
      } catch (err) {
        console.error("Failed to load examiner analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("examiner_control_center")}</h1>
            <Badge variant="indigo">{t("examiner_authority")}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("examiner_hero_desc")}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/examiner/questions">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> {t("question_bank")}
            </Button>
          </Link>
          <Link href="/examiner/exams">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
              <Layers className="h-3.5 w-3.5 text-emerald-400" /> {t("configure_exam")}
            </Button>
          </Link>
          <Link href="/examiner/monitoring">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold">
              <Eye className="h-3.5 w-3.5 text-cyan-400" /> {t("live_monitoring")}
              {activeCandidatesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {activeCandidatesCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/examiner/evaluations">
            <Button variant="primary" size="sm" className="gap-1.5 font-bold shadow-md shadow-indigo-500/20">
              <Award className="h-3.5 w-3.5 text-white" /> {t("valuation_workspace_btn")}
              {pendingEvalCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#080C14] text-indigo-300 border border-indigo-500/40 text-[10px] font-black">
                  {pendingEvalCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Proctoring & Surveillance Widget */}
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

          <Link href="/examiner/monitoring">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-800 text-indigo-400 hover:text-white hover:bg-slate-800/60 font-semibold">
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

      {/* Valuation Attention Banner (if pending) */}
      {(pendingEvalCount > 0 || readyPublishCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {pendingEvalCount > 0
                  ? `${pendingEvalCount} ${t("examiner_eval_pending_title")}`
                  : `${readyPublishCount} ${t("examiner_eval_ready_title")}`}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("examiner_eval_desc")}
              </p>
            </div>
          </div>
          <Link href="/examiner/evaluations">
            <Button variant="primary" size="sm" className="w-full sm:w-auto font-bold gap-1.5 shadow-md shadow-indigo-500/20">
              {t("launch_valuation_workspace")} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title={t("total_questions")}
          value={isLoading ? "..." : (analytics?.total_questions ?? 0).toLocaleString()}
          subtitle={t("in_question_bank")}
          icon={BookOpen}
          variant="indigo"
        />
        <StatCard
          title={t("active_exams_stat")}
          value={isLoading ? "..." : analytics?.active_exams ?? 0}
          subtitle={t("ongoing_window")}
          icon={Clock}
          variant="emerald"
        />
        <StatCard
          title={t("total_exams_stat")}
          value={isLoading ? "..." : analytics?.total_exams ?? 0}
          subtitle={t("scheduled_pool")}
          icon={Layers}
          variant="slate"
        />
        <StatCard
          title={t("candidates")}
          value={isLoading ? "..." : analytics?.registered_candidates ?? 0}
          subtitle={t("registered_stat")}
          icon={Users}
          variant="cyan"
        />
        <StatCard
          title={t("average_score")}
          value={isLoading ? "..." : `${analytics?.average_performance ?? 0}%`}
          subtitle={t("evaluated_stat")}
          icon={TrendingUp}
          variant="indigo"
        />
        <StatCard
          title={t("highest_score")}
          value={isLoading ? "..." : `${analytics?.highest_score ?? 0}%`}
          subtitle={t("peak_mark")}
          icon={Award}
          variant="amber"
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-4 p-6 hover:shadow-xl hover:border-indigo-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <Badge variant="indigo">{t("repository")}</Badge>
          </div>
          <h2 className="text-base font-bold text-white">{t("question_bank_card_title")}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("question_bank_card_desc")}
          </p>
          <div className="pt-2">
            <Link href="/examiner/questions">
              <Button variant="outline" size="sm" className="w-full text-xs justify-between border-slate-800 text-indigo-400 hover:text-white hover:bg-slate-800/60">
                {t("open_question_bank")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-6 hover:shadow-xl hover:border-emerald-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <Badge variant="emerald">{t("randomization_active")}</Badge>
          </div>
          <h2 className="text-base font-bold text-white">{t("exam_arch_title")}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("exam_arch_desc")}
          </p>
          <div className="pt-2">
            <Link href="/examiner/exams">
              <Button variant="primary" size="sm" className="w-full text-xs justify-between shadow-sm">
                {t("configure_examinations")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-6 hover:shadow-xl hover:border-amber-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <Badge variant="amber">{t("live_evaluations")}</Badge>
          </div>
          <h2 className="text-base font-bold text-white">{t("results_analytics_title")}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("results_analytics_desc")}
          </p>
          <div className="pt-2">
            <Link href="/examiner/results">
              <Button variant="outline" size="sm" className="w-full text-xs justify-between border-slate-800 text-amber-400 hover:text-white hover:bg-slate-800/60">
                {t("view_results_exports")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-6 hover:shadow-xl hover:border-cyan-500/40 transition-all border-slate-800 bg-[#0D1322]/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              <Award className="h-6 w-6" />
            </div>
            <Badge variant="cyan">{t("valuation_grading")}</Badge>
          </div>
          <h2 className="text-base font-bold text-white">{t("authoritative_valuation")}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("authoritative_valuation_desc")}
          </p>
          <div className="pt-2">
            <Link href="/examiner/evaluations">
              <Button variant="outline" size="sm" className="w-full text-xs justify-between border-slate-800 text-cyan-400 hover:text-white hover:bg-slate-800/60">
                {t("open_valuation_workspace")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}