"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Button, Card, Badge, Alert } from "@/components/UIComponents";
import {
  Lock,
  Mail,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Shield,
  CheckCircle2,
  Sparkles,
  Eye,
  Cpu,
  Video,
  Check
} from "lucide-react";

type LoginRole = "STUDENT" | "EXAMINER" | "ADMIN";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<LoginRole>("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleTabChange = (role: LoginRole) => {
    setSelectedRole(role);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, role, user_id, name, registration_number } = res.data;
      login(access_token, {
        id: user_id,
        name,
        email,
        role,
        registration_number,
        is_active: true
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Visual AI & Trust Identity */}
        <div className="lg:col-span-5 space-y-6 hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-indigo-500/30 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>{t("intelligent_assessment_ecosystem")}</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            {t("login_hero_title")}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t("login_hero_desc")}
          </p>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Video className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t("card_proctoring_title")}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{t("login_proctor_feature_desc")}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t("login_ai_feature_title")}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{t("login_ai_feature_desc")}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t("card_results_title")}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{t("login_results_feature_desc")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sleek Auth Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header */}
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t("sign_in_title")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {t("sign_in_subtitle")}
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="bg-[#0D1322] p-1.5 rounded-2xl grid grid-cols-3 gap-1 border border-slate-800 shadow-md">
            <button
              type="button"
              onClick={() => handleRoleTabChange("STUDENT")}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedRole === "STUDENT"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className={`h-4 w-4 ${selectedRole === "STUDENT" ? "text-indigo-400" : ""}`} />
              <span>{t("student")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange("EXAMINER")}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedRole === "EXAMINER"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className={`h-4 w-4 ${selectedRole === "EXAMINER" ? "text-indigo-400" : ""}`} />
              <span>{t("examiner")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange("ADMIN")}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedRole === "ADMIN"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className={`h-4 w-4 ${selectedRole === "ADMIN" ? "text-indigo-400" : ""}`} />
              <span>{t("admin")}</span>
            </button>
          </div>

          {/* Main Login Card */}
          <Card className="p-6 sm:p-8 space-y-6 border-slate-800 bg-[#0D1322] shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  {selectedRole === "STUDENT" ? t("student_login") : selectedRole === "EXAMINER" ? t("examiner_login") : t("admin_login")}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedRole === "STUDENT" ? t("demo_student_desc") : selectedRole === "EXAMINER" ? t("demo_examiner_desc") : t("demo_admin_desc")}
                </p>
              </div>
              <Badge variant={selectedRole === "STUDENT" ? "emerald" : selectedRole === "EXAMINER" ? "indigo" : "gold"}>
                {selectedRole === "ADMIN" ? t("admin") : selectedRole === "EXAMINER" ? t("examiner") : t("student")}
              </Badge>
            </div>

            {error && <Alert type="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {t("email_address")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {t("password")}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                  >
                    {t("forgot_password")}
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-xs font-bold shadow-lg shadow-indigo-600/25"
                isLoading={isLoading}
              >
                {t("sign_in_button")}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>

            {/* Student Registration Link */}
            <div className="text-center text-xs text-slate-400 pt-3 border-t border-slate-800">
              {t("no_account")}{" "}
              <Link href="/register" className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline">
                {t("register_here")}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
