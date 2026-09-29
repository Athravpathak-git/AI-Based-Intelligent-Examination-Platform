"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Badge, Button, Alert, StatCard, ProgressBar } from "@/components/UIComponents";
import {
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Target,
  Sparkles,
  BarChart3
} from "lucide-react";

interface SubjectMetric {
  subject: string;
  average_percentage: number;
  tests_taken: number;
}

interface ScoreHistoryItem {
  result_id: number;
  exam_name: string;
  subject: string;
  percentage: number;
  date: string;
}

interface StudentAnalyticsData {
  total_attempts: number;
  average_score: number;
  best_score: number;
  passed_exams: number;
  failed_exams: number;
  subject_breakdown?: SubjectMetric[];
  history?: ScoreHistoryItem[];
}

export default function StudentPerformancePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<StudentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<StudentAnalyticsData>("/analytics/student");
      setAnalytics(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const passRate =
    analytics && analytics.total_attempts > 0
      ? Math.round((analytics.passed_exams / analytics.total_attempts) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t("performance_analytics_title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("performance_analytics_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/student/results">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Award className="h-4 w-4 text-indigo-400" /> {t("view_scorecards")}
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={fetchAnalytics}>
            {t("refresh")}
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("overall_average")}
          value={`${analytics?.average_score ?? 0}%`}
          subtitle={t("cumulative_average_score")}
          icon={TrendingUp}
          variant="indigo"
        />
        <StatCard
          title={t("best_performance")}
          value={`${analytics?.best_score ?? 0}%`}
          subtitle={t("highest_exam_score")}
          icon={Award}
          variant="emerald"
        />
        <StatCard
          title={t("total_exams_completed")}
          value={analytics?.total_attempts ?? 0}
          subtitle={`${analytics?.passed_exams ?? 0} ${t("status_passed")} • ${analytics?.failed_exams ?? 0} ${t("status_failed")}`}
          icon={CheckCircle2}
          variant="cyan"
        />
        <StatCard
          title={t("academic_pass_rate")}
          value={`${passRate}%`}
          subtitle={t("percentage_passed_assessments")}
          icon={Target}
          variant="amber"
        />
      </div>

      {/* Subject-Wise Performance Breakdown */}
      <Card className="space-y-4 border-slate-800 bg-[#0D1322] shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">{t("subject_proficiency_breakdown")}</h3>
          </div>
          <span className="text-xs text-slate-400">{t("server_authoritative_calc")}</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading subject performance data...</div>
        ) : !analytics?.subject_breakdown || analytics.subject_breakdown.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No completed assessments recorded yet. Complete an exam to view proficiency statistics.
          </div>
        ) : (
          <div className="space-y-4">
            {analytics.subject_breakdown.map((item, idx) => (
              <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.subject}</span>
                    <Badge variant="slate">{item.tests_taken} {item.tests_taken === 1 ? "Test" : "Tests"}</Badge>
                  </div>
                  <span className="font-mono font-bold text-indigo-400">{item.average_percentage}%</span>
                </div>
                <ProgressBar
                  value={item.average_percentage}
                  max={100}
                  variant={item.average_percentage >= 70 ? "emerald" : item.average_percentage >= 50 ? "gold" : "rose"}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Score History */}
      <Card className="space-y-4 border-slate-800 bg-[#0D1322] shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Recent Assessment Score History</h3>
          </div>
          <Link href="/student/results" className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1">
            All Results <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading score history...</div>
        ) : !analytics?.history || analytics.history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No recent test scores found.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {analytics.history.map((h, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-white">{h.exam_name}</div>
                  <div className="text-xs text-slate-400">{h.subject} • {h.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-base font-black font-mono ${h.percentage >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                    {h.percentage}%
                  </span>
                  <Badge variant={h.percentage >= 50 ? "emerald" : "rose"}>
                    {h.percentage >= 50 ? "Pass" : "Fail"}
                  </Badge>
                  <Link href={`/student/results?result_id=${h.result_id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
