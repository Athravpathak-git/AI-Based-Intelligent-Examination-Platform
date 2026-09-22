"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Badge, StatCard } from "@/components/UIComponents";
import {
  BookOpen,
  Layers,
  Users,
  TrendingUp,
  Award,
  ArrowRight,
  Clock,
  KeyRound
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
  const [analytics, setAnalytics] = useState<ExaminerAnalytics | null>(null);
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);
  const [readyPublishCount, setReadyPublishCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [res, pendingRes] = await Promise.all([
          api.get<ExaminerAnalytics>("/analytics/examiner"),
          api.get<any[]>("/evaluations/pending")
        ]);
        setAnalytics(res.data);
        if (Array.isArray(pendingRes.data)) {
          setPendingEvalCount(pendingRes.data.filter((i) => i.evaluation_status === "AWAITING_SUBJECTIVE_EVALUATION" || i.evaluation_status === "EVALUATION_IN_PROGRESS").length);
          setReadyPublishCount(pendingRes.data.filter((i) => i.evaluation_status === "READY_FOR_PUBLICATION").length);
        }
      } catch (err) {
        console.error("Failed to load examiner analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1F] tracking-tight">Examiner Control Center</h1>
            <Badge variant="saffron">Examiner Authority</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B76] mt-1">
            Assessment architecture, random paper generation parameters, and candidate performance analytics.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/examiner/questions">
            <Button variant="outline" size="sm" className="gap-1.5 border-[#EAE6DF] text-[#1C1C1F]">
              <BookOpen className="h-3.5 w-3.5 text-[#E06A26]" /> Question Bank
            </Button>
          </Link>
          <Link href="/examiner/exams">
            <Button variant="outline" size="sm" className="gap-1.5 border-[#EAE6DF] text-[#1C1C1F]">
              <Layers className="h-3.5 w-3.5 text-[#2B7853]" /> Configure Exam
            </Button>
          </Link>
          <Link href="/examiner/evaluations">
            <Button variant="primary" size="sm" className="gap-1.5 font-bold shadow-xs">
              <Award className="h-3.5 w-3.5" /> Valuation Workspace
              {pendingEvalCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white text-[#E06A26] text-[10px] font-black">
                  {pendingEvalCount} Pending
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Valuation Attention Banner (if pending) */}
      {(pendingEvalCount > 0 || readyPublishCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E06A26]/30 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] flex items-center justify-center text-[#E06A26] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1C1C1F]">
                {pendingEvalCount > 0
                  ? `${pendingEvalCount} Candidate Assessment(s) Awaiting Valuation`
                  : `${readyPublishCount} Assessment(s) Ready for Official Publication`}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Grade subjective submissions, review AI marks suggestions, and declare published results.
              </p>
            </div>
          </div>
          <Link href="/examiner/evaluations">
            <Button variant="primary" size="sm" className="w-full sm:w-auto font-bold gap-1.5">
              Launch Valuation Workspace <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Questions"
          value={isLoading ? "..." : (analytics?.total_questions ?? 0).toLocaleString()}
          subtitle="In Question Bank"
          icon={BookOpen}
          variant="saffron"
        />
        <StatCard
          title="Active Exams"
          value={isLoading ? "..." : analytics?.active_exams ?? 0}
          subtitle="Ongoing window"
          icon={Clock}
          variant="emerald"
        />
        <StatCard
          title="Total Exams"
          value={isLoading ? "..." : analytics?.total_exams ?? 0}
          subtitle="Scheduled pool"
          icon={Layers}
          variant="slate"
        />
        <StatCard
          title="Candidates"
          value={isLoading ? "..." : analytics?.registered_candidates ?? 0}
          subtitle="Registered"
          icon={Users}
          variant="terracotta"
        />
        <StatCard
          title="Avg Score"
          value={isLoading ? "..." : `${analytics?.average_performance ?? 0}%`}
          subtitle="Evaluated"
          icon={TrendingUp}
          variant="saffron"
        />
        <StatCard
          title="Top Score"
          value={isLoading ? "..." : `${analytics?.highest_score ?? 0}%`}
          subtitle="Peak mark"
          icon={Award}
          variant="amber"
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-4 p-6 hover:shadow-md hover:border-[#E06A26]/50 transition-all border-[#EAE6DF] bg-white">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#FEF3EC] text-[#E06A26] rounded-2xl border border-[#FAD9C5]">
              <BookOpen className="h-6 w-6" />
            </div>
            <Badge variant="saffron">Repository</Badge>
          </div>
          <h2 className="text-base font-bold text-[#1C1C1F]">Question Bank & Catalog</h2>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            Manage your question repository across subjects. Bulk import questions via CSV template, download printable PDF catalogs, and filter by difficulty.
          </p>
          <div className="pt-2">
            <Link href="/examiner/questions">
              <Button variant="outline" size="sm" className="w-full text-xs justify-between border-[#EAE6DF] text-[#E06A26] hover:bg-[#FEF3EC]">
                Open Question Bank <ArrowRight className="h-3.5 w-3.5 text-[#E06A26]" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-6 hover:shadow-md hover:border-[#2B7853]/50 transition-all border-[#EAE6DF] bg-white">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#EFF7F2] text-[#2B7853] rounded-2xl border border-[#C4DFD3]">
              <Layers className="h-6 w-6" />
            </div>
            <Badge variant="emerald">Randomization Active</Badge>
          </div>
          <h2 className="text-base font-bold text-[#1C1C1F]">Exam Architecture & Rules</h2>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            Create scheduled assessments with deterministic random paper generation, negative marking, tab switch limits, webcam monitoring, and view registered candidates.
          </p>
          <div className="pt-2">
            <Link href="/examiner/exams">
              <Button variant="primary" size="sm" className="w-full text-xs justify-between">
                Configure Examinations <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-6 hover:shadow-md hover:border-[#D97706]/50 transition-all border-[#EAE6DF] bg-white">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#FEF7EC] text-[#D97706] rounded-2xl border border-[#FDE68A]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <Badge variant="amber">Live Evaluations</Badge>
          </div>
          <h2 className="text-base font-bold text-[#1C1C1F]">Candidate Results & Analytics</h2>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            Review detailed candidate scorecards, export results to CSV spreadsheets, analyze pass/fail rates, and track proctoring security flags.
          </p>
          <div className="pt-2">
            <Link href="/examiner/results">
              <Button variant="outline" size="sm" className="w-full text-xs justify-between border-[#EAE6DF] text-[#D97706] hover:bg-[#FEF7EC]">
                View Results & Exports <ArrowRight className="h-3.5 w-3.5 text-[#D97706]" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-6 hover:shadow-md hover:border-[#E06A26]/50 transition-all border-[#EAE6DF] bg-white">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#FEF3EC] text-[#E06A26] rounded-2xl border border-[#FAD9C5]">
              <Award className="h-6 w-6" />
            </div>
            <Badge variant="saffron">Valuation & Grading</Badge>
          </div>
          <h2 className="text-base font-bold text-[#1C1C1F]">Authoritative Valuation</h2>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            Grade subjective answers, review OCR handwritten transcripts, apply AI marks suggestions, and declare published results.
          </p>
          <div className="pt-2">
            <Link href="/examiner/evaluations">
              <Button variant="outline" size="sm" className="w-full text-xs justify-between border-[#EAE6DF] text-[#E06A26] hover:bg-[#FEF3EC]">
                Open Valuation Workspace <ArrowRight className="h-3.5 w-3.5 text-[#E06A26]" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}