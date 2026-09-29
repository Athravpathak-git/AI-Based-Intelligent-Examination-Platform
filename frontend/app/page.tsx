"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Button, Card, Badge } from "@/components/UIComponents";
import {
  BookOpen,
  Clock,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Shield,
  Video,
  Sparkles,
  CheckCircle2,
  Lock,
  Cpu,
  Eye,
  FileCheck,
  Languages,
  Activity,
  BarChart3,
  Layers,
  Terminal,
  Zap,
  Check
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeFeatureTab, setActiveFeatureTab] = useState<"exam" | "proctor" | "valuation" | "analytics">("exam");

  return (
    <div className="space-y-16 py-4 max-w-7xl mx-auto">
      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B0F1A] p-6 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl">
        {/* Luminous Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-lg shadow-indigo-950/40">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>{t("platform_title")}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
            {t("hero_headline_1")} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300">
              {t("hero_headline_2")}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t("landing_subtitle")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
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
                <Button variant="primary" size="lg" className="gap-2 px-8 py-3.5 text-sm font-bold shadow-xl shadow-indigo-600/30">
                  {t("console_btn", { role: user.role === "STUDENT" ? t("student") : user.role === "EXAMINER" ? t("examiner") : t("admin") })} &rarr;
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="primary" size="lg" className="gap-2.5 px-8 py-3.5 text-sm font-bold shadow-xl shadow-indigo-600/30">
                    {t("login")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="lg" className="px-7 py-3.5 text-sm font-semibold border-slate-700 hover:border-slate-500">
                    {t("register")}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust Meta Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-400 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>{t("automated_webcam_proctoring")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span>{t("ai_semantic_valuation_badge")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-cyan-400" />
              <span>{t("authoritative_persistence_engine")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-amber-400" />
              <span>{t("seven_indic_languages_supported")}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. HIGH-TECH PRODUCT MOCKUP HUD                           */}
        {/* ========================================================= */}
        <div className="mt-12 max-w-5xl mx-auto rounded-2xl bg-[#080C14] border border-slate-700/80 shadow-2xl overflow-hidden">
          {/* Mockup Titlebar */}
          <div className="bg-[#0F172A] px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-slate-400 hidden sm:inline">intelliexam-runtime://session-live-hud</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                {t("live_hud_active")}
              </span>
              <span className="font-mono text-slate-300 font-bold hidden sm:inline">{t("mock_remaining_time")}</span>
            </div>
          </div>

          {/* Mockup Body Preview */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-b from-[#090D18] to-[#060910]">
            {/* Left Col: Live Exam Runner */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="indigo">{t("question_4_of_25")}</Badge>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {t("autosaved_to_cloud")}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white">
                  {t("mock_question_text")}
                </h4>
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between">
                    <span>{t("mock_option_a")}</span>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-400 bg-indigo-400 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-slate-950" />
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 flex items-center justify-between">
                    <span>{t("mock_option_b")}</span>
                    <span className="h-3.5 w-3.5 rounded-full border border-slate-600" />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>{t("authoritative_time_drift")} <strong className="text-white font-mono">&lt; 0.04s</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{t("fullscreen_sealed_session")}</span>
                </div>
              </div>
            </div>

            {/* Right Col: AI Proctoring & Valuation Telemetry */}
            <div className="lg:col-span-5 space-y-4">
              {/* Webcam Beacon */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-cyan-400" /> {t("proctoring_telemetry")}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {t("sixty_fps_tracking")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{t("gaze_orientation")}</span>
                    <p className="font-semibold text-emerald-400 mt-0.5">{t("centered_percentage")}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{t("face_presence")}</span>
                    <p className="font-semibold text-emerald-400 mt-0.5">{t("single_verified")}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{t("tab_switching_label")}</span>
                    <p className="font-semibold text-emerald-400 mt-0.5">{t("zero_events")}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{t("audio_noise")}</span>
                    <p className="font-semibold text-slate-300 mt-0.5">{t("fourteen_db_quiet")}</p>
                  </div>
                </div>
              </div>

              {/* AI Valuation Preview */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> {t("login_ai_feature_title")}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">{t("confidence_96")}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t("suggested_score_label")}</span>
                  <span className="font-mono font-bold text-white text-sm">9.5 / 10.0</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full w-[95%]" />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {t("mock_rubric_alignment")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CAPABILITY STRIP (6 CORE PILLARS)                      */}
      {/* ========================================================= */}
      <div className="space-y-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {t("engineered_academic_rigor")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          {t("engineered_academic_rigor_desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="p-6 space-y-3 hover:border-indigo-500/40">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Eye className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">{t("card_proctoring_title")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("card_proctoring_desc")}
          </p>
        </Card>

        <Card className="p-6 space-y-3 hover:border-cyan-500/40">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">{t("card_valuation_title")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("card_valuation_desc")}
          </p>
        </Card>

        <Card className="p-6 space-y-3 hover:border-emerald-500/40">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">{t("card_results_title")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("card_results_desc")}
          </p>
        </Card>

        <Card className="p-6 space-y-3 hover:border-amber-500/40">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">{t("card_timer_title")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("card_timer_desc")}
          </p>
        </Card>

        <Card className="p-6 space-y-3 hover:border-purple-500/40">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Languages className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">{t("card_languages_title")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("card_languages_desc")}
          </p>
        </Card>

        <Card className="p-6 space-y-3 hover:border-rose-500/40">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">{t("card_security_title")}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t("card_security_desc")}
          </p>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* 4. PERSONA ENTRY PORTALS (STUDENT, EXAMINER, ADMIN)       */}
      {/* ========================================================= */}
      <div className="space-y-6 pt-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t("role_optimized_workspaces")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {t("role_optimized_workspaces_desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Portal Card */}
          <Card className="p-6 space-y-5 flex flex-col justify-between hover:border-emerald-500/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <Badge variant="emerald">{t("candidate_access")}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{t("student_login")}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {t("demo_student_desc")}
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs justify-between border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400">
                  {t("enter_as_student")} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Examiner Workspace Card */}
          <Card className="p-6 space-y-5 flex flex-col justify-between hover:border-indigo-500/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Briefcase className="h-6 w-6" />
                </div>
                <Badge variant="indigo">{t("faculty_access")}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{t("examiner_portal")}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {t("demo_examiner_desc")}
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs justify-between border-slate-700 hover:border-indigo-500/50 hover:text-indigo-400">
                  {t("enter_as_examiner")} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Admin Console Card */}
          <Card className="p-6 space-y-5 flex flex-col justify-between hover:border-amber-500/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Shield className="h-6 w-6" />
                </div>
                <Badge variant="gold">{t("governance_access")}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{t("admin_console")}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {t("demo_admin_desc")}
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs justify-between border-slate-700 hover:border-amber-500/50 hover:text-amber-400">
                  {t("enter_as_admin")} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. INTERACTIVE PRODUCT CAPABILITY SHOWCASE TABS           */}
      {/* ========================================================= */}
      <Card className="p-6 sm:p-8 space-y-6 bg-[#090D18] border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">{t("platform_capabilities_deep_dive")}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t("platform_capabilities_deep_dive_desc")}</p>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveFeatureTab("exam")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFeatureTab === "exam" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("tab_exam_runner")}
            </button>
            <button
              onClick={() => setActiveFeatureTab("proctor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFeatureTab === "proctor" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("tab_proctoring_guard")}
            </button>
            <button
              onClick={() => setActiveFeatureTab("valuation")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFeatureTab === "valuation" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("tab_ai_valuation")}
            </button>
            <button
              onClick={() => setActiveFeatureTab("analytics")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFeatureTab === "analytics" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("tab_analytics_results")}
            </button>
          </div>
        </div>

        {activeFeatureTab === "exam" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <Badge variant="indigo">{t("badge_high_perf_runner")}</Badge>
              <h4 className="text-xl font-bold text-white">{t("showcase_exam_title")}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("showcase_exam_desc")}
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_exam_b1")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_exam_b2")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_exam_b3")}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-500">
                <span>{t("mock_session_integrity_check")}</span>
              </div>
              <p className="text-emerald-400">{t("mock_fs_lock_active")}</p>
              <p className="text-slate-300">{t("mock_keystroke_synced")}</p>
              <p className="text-slate-300">{t("mock_blur_listener")}</p>
              <p className="text-cyan-400">{t("mock_heartbeat_ok")}</p>
            </div>
          </div>
        )}

        {activeFeatureTab === "proctor" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <Badge variant="cyan">{t("badge_ai_vision_engine")}</Badge>
              <h4 className="text-xl font-bold text-white">{t("showcase_proctor_title")}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("showcase_proctor_desc")}
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_proctor_b1")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_proctor_b2")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_proctor_b3")}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-500">
                <span>{t("mock_proctor_beacon")}</span>
              </div>
              <p className="text-slate-300">{t("mock_camera_stream")}</p>
              <p className="text-emerald-400">{t("mock_face_landmark")}</p>
              <p className="text-slate-300">{t("mock_pitch_yaw")}</p>
              <p className="text-emerald-400">{t("mock_suspicion_index")}</p>
            </div>
          </div>
        )}

        {activeFeatureTab === "valuation" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <Badge variant="gold">{t("badge_semantic_intelligence")}</Badge>
              <h4 className="text-xl font-bold text-white">{t("showcase_valuation_title")}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("showcase_valuation_desc")}
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_valuation_b1")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_valuation_b2")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_valuation_b3")}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-500">
                <span>{t("mock_eval_model_status")}</span>
              </div>
              <p className="text-slate-300">{t("mock_model_name")}</p>
              <p className="text-emerald-400">{t("mock_cosine_sim")}</p>
              <p className="text-indigo-400">{t("mock_rubric_cov")}</p>
              <p className="text-emerald-400">{t("mock_suggested_pass")}</p>
            </div>
          </div>
        )}

        {activeFeatureTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <Badge variant="emerald">{t("badge_academic_audit")}</Badge>
              <h4 className="text-xl font-bold text-white">{t("showcase_analytics_title")}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("showcase_analytics_desc")}
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_analytics_b1")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_analytics_b2")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t("showcase_analytics_b3")}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-500">
                <span>{t("mock_transcript_integrity")}</span>
              </div>
              <p className="text-slate-300">{t("mock_signature_ok")}</p>
              <p className="text-emerald-400">{t("mock_auth_status_pass")}</p>
              <p className="text-slate-300">{t("mock_decoupled_attempt")}</p>
              <p className="text-cyan-400">{t("mock_export_engine_ready")}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
