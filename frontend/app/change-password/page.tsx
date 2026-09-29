"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Button, Alert } from "@/components/UIComponents";
import { KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, Lock } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess("Your password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "EXAMINER"
      ? "/examiner"
      : "/student";

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={dashboardHref}
          className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t("change_password")}</h1>
          <p className="text-xs text-slate-400">
            {t("forgot_password_subtitle")}
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8 space-y-6 border-slate-800/80 bg-[#0D1322]/90 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{t("credential_security")}</h3>
            <p className="text-xs text-slate-400">
              {t("credential_security_desc")}
            </p>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t("current_password")}
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-900/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t("new_password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-900/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t("confirm_password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-900/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Link href={dashboardHref}>
              <Button type="button" variant="outline" className="text-xs border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700">
                {t("cancel")}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="text-xs px-6 py-2.5 gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
            >
              <ShieldCheck className="h-4 w-4" />
              {t("change_password")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}