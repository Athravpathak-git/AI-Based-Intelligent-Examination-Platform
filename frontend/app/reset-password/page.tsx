"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { Card, Button, Alert } from "@/components/UIComponents";
import { Lock, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing from the link. Please request a new password reset link.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8 shadow-xl border-[#EAE6DF] bg-[#FFFFFF] rounded-2xl">
      <div className="text-center space-y-2 mb-6">
        <div className="mx-auto w-12 h-12 bg-[#FEF3EC] text-[#E06A26] rounded-2xl flex items-center justify-center shadow-xs border border-[#FAD9C5]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-[#1C1C1F] tracking-tight">Set New Password</h1>
        <p className="text-xs text-[#6B6B76]">
          Enter and confirm your new secure examination account password below.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {success ? (
        <div className="space-y-5 text-center py-4">
          <div className="mx-auto w-12 h-12 bg-[#2B7853]/10 text-[#2B7853] rounded-full flex items-center justify-center border border-[#2B7853]/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-[#1C1C1F] text-base">Password Updated</h3>
            <p className="text-xs text-[#6B6B76] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EAE6DF]">
              Your password has been successfully reset. You can now use your new password to sign in.
            </p>
          </div>
          <Link href="/login" className="block">
            <Button variant="primary" className="w-full text-xs py-2.5 shadow-xs">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1C1C1F] uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A29E]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1C1C1F] uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A29E]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-xs font-bold shadow-md shadow-[#E06A26]/10 mt-2"
            isLoading={isLoading}
          >
            Update Password & Access
          </Button>

          <div className="text-center pt-3 border-t border-[#EAE6DF]">
            <Link
              href="/login"
              className="text-xs font-semibold text-[#E06A26] hover:text-[#C95716] hover:underline flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <Suspense fallback={<div className="text-center text-xs text-[#6B6B76]">Loading session...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
