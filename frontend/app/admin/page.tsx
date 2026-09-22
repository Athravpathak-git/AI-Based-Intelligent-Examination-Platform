"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
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
  KeyRound,
  FileSpreadsheet,
  Calendar,
  Award,
  AlertTriangle,
  Clock,
  Plus
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
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);
  const [readyPublishCount, setReadyPublishCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, evalRes] = await Promise.all([
          api.get<AdminAnalytics>("/analytics/admin"),
          api.get<any[]>("/evaluations/pending").catch(() => ({ data: [] }))
        ]);
        setAnalytics(aRes.data);
        if (Array.isArray(evalRes.data)) {
          setPendingEvalCount(evalRes.data.filter((i) => i.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION" || i.evaluation_status === "EVALUATION_IN_PROGRESS").length);
          setReadyPublishCount(evalRes.data.filter((i) => i.evaluation_status === "READY_FOR_PUBLICATION").length);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3EC] border border-[#FAD9C5] flex items-center justify-center text-[#E06A26] shrink-0 mt-0.5 shadow-xs">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">Administrator Command Center</h1>
              <Badge variant="emerald">Tier 1 Authority</Badge>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Institutional oversight, candidate governance, examination architecture, and platform evaluation telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/admin/candidates">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-stone-300 hover:bg-stone-100">
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#E06A26]" /> Candidate Rosters
            </Button>
          </Link>
          <Link href="/admin/evaluations">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs bg-[#1C1C1F] hover:bg-[#25252A] border-0 text-white font-bold">
              <Award className="h-3.5 w-3.5 text-[#E06A26]" /> Valuation & Declaration
              {pendingEvalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E06A26] text-white">
                  {pendingEvalCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-stone-300 hover:bg-stone-100 font-bold">
              <Users className="h-3.5 w-3.5 text-stone-600" /> User Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Valuation Attention Banner */}
      {(pendingEvalCount > 0 || readyPublishCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E06A26]/30 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] flex items-center justify-center text-[#E06A26] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">
                {pendingEvalCount > 0
                  ? `${pendingEvalCount} Submissions Awaiting Valuation Platform-Wide`
                  : `${readyPublishCount} Assessment(s) Ready for Result Declaration`}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Oversee academic grading, evaluate subjective answers, and declare published official results.
              </p>
            </div>
          </div>
          <Link href="/admin/evaluations">
            <Button variant="primary" size="sm" className="w-full sm:w-auto font-bold gap-1.5 bg-[#E06A26] hover:bg-[#C95716] border-0 text-white">
              Launch Valuation Workspace <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Institutional Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Enrolled Students</span>
            <UserCheck className="h-4 w-4 text-[#E06A26]" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {isLoading ? "..." : analytics?.total_students ?? 0}
          </div>
          <p className="text-[11px] text-stone-500">Unique registered candidates</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faculty Examiners</span>
            <Users className="h-4 w-4 text-[#C85332]" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {isLoading ? "..." : analytics?.total_examiners ?? 0}
          </div>
          <p className="text-[11px] text-stone-500">Accredited course creators</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Assessments</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {isLoading ? "..." : analytics?.active_exams ?? 0}
          </div>
          <p className="text-[11px] text-stone-500">Currently live testing windows</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Sessions</span>
            <CheckCircle2 className="h-4 w-4 text-stone-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {isLoading ? "..." : analytics?.completed_exams ?? 0}
          </div>
          <p className="text-[11px] text-stone-500">Graded attempt transcripts</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Valuations</span>
            <Award className="h-4 w-4 text-[#E06A26]" />
          </div>
          <div className={`text-2xl font-black font-mono ${pendingEvalCount > 0 ? "text-[#E06A26]" : "text-stone-900"}`}>
            {isLoading ? "..." : pendingEvalCount}
          </div>
          <p className="text-[11px] text-stone-500">Assessments awaiting valuation</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Institution Average</span>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {isLoading ? "..." : `${Math.round(analytics?.global_average ?? 0)}%`}
          </div>
          <p className="text-[11px] text-stone-500">Global candidate percentile</p>
        </div>
      </div>

      {/* Quick Access Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4 hover:shadow-md transition-all border-stone-200 bg-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] text-[#E06A26] flex items-center justify-center border border-[#FAD9C5]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Platform Valuation & Results</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Institutional oversight of all candidate submissions, authoritative subjective grading, and official result publication.
              </p>
            </div>
          </div>
          <Link href="/admin/evaluations">
            <Button variant="outline" className="w-full text-xs justify-between border-stone-300 text-stone-800 hover:bg-stone-50">
              Open Valuation ({pendingEvalCount} Pending) <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="p-6 space-y-4 hover:shadow-md transition-all border-stone-200 bg-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] text-[#C85332] flex items-center justify-center border border-[#F8D3C8]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Candidate Rosters & Audit</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Export 28-column institutional assessment telemetry CSV, inspect proctoring event logs, and verify scorecards.
              </p>
            </div>
          </div>
          <Link href="/admin/candidates">
            <Button variant="outline" className="w-full text-xs justify-between border-stone-300 text-stone-800 hover:bg-stone-50">
              Open Candidate Directory <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="p-6 space-y-4 hover:shadow-md transition-all border-stone-200 bg-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Identity & Role Management</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Administer user roles (Student, Examiner, Admin), manage account active statuses, and enforce academic credential standards.
              </p>
            </div>
          </div>
          <Link href="/admin/users">
            <Button variant="outline" className="w-full text-xs justify-between border-stone-300 text-stone-800 hover:bg-stone-50">
              Manage Platform Users <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Operational Overview */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-900">Institutional Examination Registry</h2>
            <p className="text-xs text-stone-500">Repository scale and question bank asset distribution</p>
          </div>
          <Link href="/examiner/exams/create">
            <Button variant="primary" size="sm" className="text-xs gap-1.5 bg-[#E06A26] hover:bg-[#C95716] border-0 text-white font-bold">
              <Plus className="h-3.5 w-3.5" /> Configure Assessment
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Configured Assessments</span>
            <div className="text-2xl font-extrabold text-stone-900 font-mono">{analytics?.total_exams ?? 0}</div>
            <p className="text-[11px] text-stone-500">Total institutional papers</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Curated Question Repository</span>
            <div className="text-2xl font-extrabold text-stone-900 font-mono">
              {analytics?.total_questions ? analytics.total_questions.toLocaleString() : 0}
            </div>
            <p className="text-[11px] text-stone-500">Multi-domain verified items</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Evaluated Attempts</span>
            <div className="text-2xl font-extrabold text-stone-900 font-mono">{analytics?.total_attempts ?? 0}</div>
            <p className="text-[11px] text-stone-500">Historical candidate submissions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
