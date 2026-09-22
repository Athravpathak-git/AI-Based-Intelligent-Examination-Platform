"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/UIComponents";
import {
  BookOpen,
  Clock,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Shield,
  Video,
  Sparkles
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-12 py-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171719] via-[#242428] to-[#1C1C1F] p-8 sm:p-12 text-white shadow-xl border border-stone-800 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#E06A26]/40 text-[#FAF8F5] text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-[#E06A26]" />
            <span>IntelliExamAI Enterprise Assessment Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            AI-Powered Intelligent Examination Platform
          </h1>

          <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Enterprise assessment infrastructure with server-authoritative countdown timing, dynamic blueprint generation, automated AI proctoring, and verified academic credentials.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            {user ? (
              <Link
                href={
                  user.role === "STUDENT"
                    ? "/student"
                    : user.role === "EXAMINER"
                    ? "/examiner"
                    : "/admin"
                }
              >
                <Button variant="primary" className="gap-2 px-7 py-3 text-sm font-bold shadow-md">
                  Go to {user.role === "STUDENT" ? "Student Dashboard" : user.role === "EXAMINER" ? "Examiner Workspace" : "Admin Console"} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="primary" className="gap-2 px-7 py-3 text-sm font-bold shadow-md">
                    Sign In to Portal <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="ghost" className="px-6 py-3 text-sm font-semibold border border-white/30 text-white hover:bg-white/10 hover:text-white">
                    Student Registration
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3 Persona Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Portal Card */}
        <Card className="p-6 space-y-4 hover:shadow-lg transition-all border-[#EAE6DF] bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#FEF3EC] text-[#E06A26] rounded-2xl flex items-center justify-center border border-[#FAD9C5]">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2B7853]/10 text-[#2B7853] border border-[#2B7853]/20">
                Candidate Access
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1C1C1F]">Student Portal</h3>
              <p className="text-xs text-[#6B6B76] mt-1.5 leading-relaxed">
                Take timed proctored examinations, review instant scorecards with performance percentiles, and download verified PDF transcripts.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="w-full text-xs justify-between border-[#EAE6DF] text-[#E06A26] hover:bg-[#FEF3EC]">
                Enter as Student <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Examiner Workspace Card */}
        <Card className="p-6 space-y-4 hover:shadow-lg transition-all border-[#EAE6DF] bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#FEF3EC] text-[#C85332] rounded-2xl flex items-center justify-center border border-[#F8DDD5]">
                <Briefcase className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                Faculty Access
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1C1C1F]">Examiner Workspace</h3>
              <p className="text-xs text-[#6B6B76] mt-1.5 leading-relaxed">
                Curate 10,000+ domain questions, configure single or mixed blueprints, inspect candidate rosters, and evaluate subjective answers.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="w-full text-xs justify-between border-[#EAE6DF] text-[#C85332] hover:bg-[#FEF3EC]">
                Enter as Examiner <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Admin Console Card */}
        <Card className="p-6 space-y-4 hover:shadow-lg transition-all border-[#EAE6DF] bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#FEF3EC] text-[#E06A26] rounded-2xl flex items-center justify-center border border-[#FAD9C5]">
                <Shield className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E06A26]/10 text-[#E06A26] border border-[#E06A26]/20">
                Governance Access
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1C1C1F]">Administrator Console</h3>
              <p className="text-xs text-[#6B6B76] mt-1.5 leading-relaxed">
                Full platform oversight, role-based user directory, system health telemetry, valuation workflows, and audit integrity controls.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="w-full text-xs justify-between border-[#EAE6DF] text-[#E06A26] hover:bg-[#FEF3EC]">
                Enter as Admin <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#EAE6DF]">
        <Card className="p-5 space-y-3 bg-white border-[#EAE6DF]">
          <div className="w-10 h-10 bg-[#FEF3EC] text-[#E06A26] rounded-xl flex items-center justify-center border border-[#FAD9C5]">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-[#1C1C1F]">Curriculum Question Bank</h3>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            Multi-subject question bank supporting MCQ, Multi-Select, Short/Long Answer questions with CSV import/export and PDF catalog.
          </p>
        </Card>

        <Card className="p-5 space-y-3 bg-white border-[#EAE6DF]">
          <div className="w-10 h-10 bg-[#2B7853]/10 text-[#2B7853] rounded-xl flex items-center justify-center border border-[#2B7853]/20">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-[#1C1C1F]">Server-Authoritative Timer</h3>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            High-precision server countdown prevents client-side clock tampering. Sessions auto-terminate strictly on expiry.
          </p>
        </Card>

        <Card className="p-5 space-y-3 bg-white border-[#EAE6DF]">
          <div className="w-10 h-10 bg-[#C85332]/10 text-[#C85332] rounded-xl flex items-center justify-center border border-[#C85332]/20">
            <Video className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-[#1C1C1F]">AI Proctoring Guard</h3>
          <p className="text-xs text-[#6B6B76] leading-relaxed">
            Live webcam face presence monitoring, gaze divergence detection, fullscreen lock enforcement, and window departure warnings.
          </p>
        </Card>
      </div>
    </div>
  );
}
