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
  KeyRound,
  CheckCircle2,
  Sparkles
} from "lucide-react";

type LoginRole = "STUDENT" | "EXAMINER" | "ADMIN";

interface DemoAccount {
  role: LoginRole;
  label: string;
  name: string;
  email: string;
  password: string;
  desc: string;
  badgeVariant: "emerald" | "terracotta" | "saffron";
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "STUDENT",
    label: "Student Portal",
    name: "Alex Walker",
    email: "student@exam.com",
    password: "student123",
    desc: "Take proctored exams, view scorecards, track performance",
    badgeVariant: "emerald"
  },
  {
    role: "EXAMINER",
    label: "Examiner Workspace",
    name: "Prof. Sarah Jenkins",
    email: "examiner@exam.com",
    password: "examiner123",
    desc: "Manage Question Bank, configure exams, review candidates & scores",
    badgeVariant: "terracotta"
  },
  {
    role: "ADMIN",
    label: "Institutional Admin",
    name: "System Administrator",
    email: "admin@exam.com",
    password: "admin123",
    desc: "Platform governance, user management, and system analytics",
    badgeVariant: "saffron"
  }
];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<LoginRole>("STUDENT");
  const [email, setEmail] = useState("student@exam.com");
  const [password, setPassword] = useState("student123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeDemo = DEMO_ACCOUNTS.find((a) => a.role === selectedRole)!;

  const handleRoleTabChange = (role: LoginRole) => {
    setSelectedRole(role);
    setError(null);
    const acc = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (acc) {
      setEmail(acc.email);
      setPassword(acc.password);
    }
  };

  const handleQuickFill = (acc: DemoAccount) => {
    setSelectedRole(acc.role);
    setEmail(acc.email);
    setPassword(acc.password);
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
    <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6 animate-fade-in-up">
      {/* Platform Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3EC] border border-[#FAD9C5] text-[#E06A26] text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-[#E06A26]" />
          <span>IntelliExamAI Unified Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#1C1C1F] tracking-tight">
          {t("sign_in_title")}
        </h1>
        <p className="text-xs text-[#6B6B76] max-w-sm mx-auto">
          {t("sign_in_subtitle")}
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="bg-[#F5F3EF] p-1.5 rounded-2xl grid grid-cols-3 gap-1 border border-[#EAE6DF] shadow-xs">
        <button
          type="button"
          onClick={() => handleRoleTabChange("STUDENT")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            selectedRole === "STUDENT"
              ? "bg-[#E06A26] text-white shadow-sm font-bold"
              : "text-[#6B6B76] hover:text-[#1C1C1F]"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>{t("student")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleTabChange("EXAMINER")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            selectedRole === "EXAMINER"
              ? "bg-[#E06A26] text-white shadow-sm font-bold"
              : "text-[#6B6B76] hover:text-[#1C1C1F]"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>{t("examiner")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleTabChange("ADMIN")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            selectedRole === "ADMIN"
              ? "bg-[#E06A26] text-white shadow-sm font-bold"
              : "text-[#6B6B76] hover:text-[#1C1C1F]"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>{t("admin")}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <Card className="p-6 sm:p-8 space-y-6 border-[#EAE6DF] bg-white shadow-card rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1F]">
              {selectedRole === "STUDENT" ? t("student_login") : selectedRole === "EXAMINER" ? t("examiner_login") : t("admin_login")}
            </h2>
            <p className="text-xs text-[#6B6B76] mt-0.5">{activeDemo.desc}</p>
          </div>
          <Badge variant={activeDemo.badgeVariant}>
            {selectedRole === "ADMIN" ? t("admin") : selectedRole === "EXAMINER" ? t("examiner") : t("student")}
          </Badge>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1C1C1F] uppercase tracking-wider">
              {t("email_address")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#1C1C1F] uppercase tracking-wider">
                {t("password")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#E06A26] hover:text-[#C95716] font-semibold hover:underline"
              >
                {t("forgot_password")}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-xs font-bold"
            isLoading={isLoading}
          >
            {t("sign_in_button")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>

        {/* 1-Click Quick-Fill Seeded Credentials */}
        <div className="pt-2 border-t border-[#EAE6DF] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#6B6B76]">
            <span className="font-semibold flex items-center gap-1.5 text-[#E06A26]">
              <KeyRound className="h-3.5 w-3.5 text-[#E06A26]" />
              Quick Fill Demo Accounts:
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickFill(acc)}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                  selectedRole === acc.role
                    ? "bg-[#FEF3EC] border-[#E06A26] text-[#E06A26] ring-1 ring-[#E06A26]"
                    : "bg-[#FAF8F5] hover:bg-[#FEF3EC] border-[#EAE6DF] text-[#1C1C1F]"
                }`}
              >
                <div className="font-bold text-[11px] truncate">{acc.label}</div>
                <div className="text-[10px] text-[#6B6B76] truncate mt-0.5">{acc.email}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Student Registration Link */}
        <div className="text-center text-xs text-[#6B6B76] pt-1 border-t border-[#EAE6DF]">
          {t("no_account")}{" "}
          <Link href="/register" className="text-[#E06A26] font-bold hover:underline">
            {t("register_here")}
          </Link>
        </div>
      </Card>
    </div>
  );
}

