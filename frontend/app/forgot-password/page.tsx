"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Button, Alert } from "@/components/UIComponents";
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setSuccessMessage(res.data.message || t("request_submitted"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <Card className="p-8 shadow-2xl border-slate-800/80 bg-[#0D1322]/95 backdrop-blur-xl rounded-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t("forgot_password_title")}</h1>
            <p className="text-xs text-slate-400">
              {t("forgot_password_subtitle")}
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {successMessage ? (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">{t("request_submitted")}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  {successMessage}
                </p>
              </div>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full text-xs py-2.5 border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("return_to_login")}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t("email_address")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-900/80 text-white focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                isLoading={isLoading}
              >
                {t("send_reset_link")}
              </Button>

              <div className="text-center pt-3 border-t border-slate-800">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> {t("back_to_auth")}
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
