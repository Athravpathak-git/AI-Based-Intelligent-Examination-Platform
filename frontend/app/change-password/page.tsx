"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { Card, Button, Alert } from "@/components/UIComponents";
import { KeyRound, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();

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
          className="p-2 rounded-xl border border-[#EAE6DF] bg-white text-[#6B6B76] hover:text-[#E06A26] hover:border-[#E06A26] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1F]">Change Password</h1>
          <p className="text-xs text-[#6B6B76]">
            Update your account password to ensure ongoing platform security
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8 space-y-6 border-[#EAE6DF] bg-white shadow-xs">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] text-[#E06A26] flex items-center justify-center shrink-0 border border-[#FAD9C5]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C1C1F]">Credential Security</h3>
            <p className="text-xs text-[#6B6B76]">
              Password must contain at least 6 characters. Do not share your password with anyone.
            </p>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && (
          <div className="p-4 rounded-xl bg-[#2B7853]/10 border border-[#2B7853]/20 text-[#2B7853] flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-white text-[#1C1C1F] focus:border-[#E06A26] focus:ring-2 focus:ring-[#E06A26]/20 focus:outline-none transition-all placeholder:text-[#6B6B76]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-white text-[#1C1C1F] focus:border-[#E06A26] focus:ring-2 focus:ring-[#E06A26]/20 focus:outline-none transition-all placeholder:text-[#6B6B76]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-white text-[#1C1C1F] focus:border-[#E06A26] focus:ring-2 focus:ring-[#E06A26]/20 focus:outline-none transition-all placeholder:text-[#6B6B76]/50"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Link href={dashboardHref}>
              <Button type="button" variant="outline" className="text-xs border-[#EAE6DF] text-[#6B6B76]">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="text-xs px-6 py-2.5 gap-2 shadow-xs"
            >
              <ShieldCheck className="h-4 w-4" />
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}