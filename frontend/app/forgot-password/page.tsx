"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { Card, Button, Alert } from "@/components/UIComponents";
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
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
      setSuccessMessage(res.data.message || "If an account exists for this information, password reset instructions have been sent.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <Card className="p-8 shadow-xl border-[#EAE6DF] bg-[#FFFFFF] rounded-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto w-12 h-12 bg-[#FEF3EC] text-[#E06A26] rounded-2xl flex items-center justify-center shadow-xs border border-[#FAD9C5]">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-[#1C1C1F] tracking-tight">Forgot Password</h1>
            <p className="text-xs text-[#6B6B76]">
              Enter the verified email address associated with your examination account.
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {successMessage ? (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto w-12 h-12 bg-[#2B7853]/10 text-[#2B7853] rounded-full flex items-center justify-center border border-[#2B7853]/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1C1C1F] text-base">Request Submitted</h3>
                <p className="text-xs text-[#6B6B76] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EAE6DF]">
                  {successMessage}
                </p>
              </div>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full text-xs py-2.5">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1C1C1F] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A29E]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. candidate@university.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-xs font-bold shadow-md shadow-[#E06A26]/10"
                isLoading={isLoading}
              >
                Send Password Reset Link
              </Button>

              <div className="text-center pt-3 border-t border-[#EAE6DF]">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-[#E06A26] hover:text-[#C95716] hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Authentication Portal
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
