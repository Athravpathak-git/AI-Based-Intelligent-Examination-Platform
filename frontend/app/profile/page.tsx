"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Button, Badge } from "@/components/UIComponents";
import {
  Mail,
  Shield,
  KeyRound,
  Lock,
  ExternalLink,
  CheckCircle2,
  Database,
  Building,
  GraduationCap
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === "STUDENT") {
      setIsLoading(true);
      api
        .get("/auth/me")
        .then((res) => setProfileData(res.data?.student_profile || {}))
        .catch((err) => console.error("Could not fetch extended profile:", err))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-16 text-center text-xs text-slate-400">
        Please log in to view your profile.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t("account_credentials_profile")}
            </h1>
            <Badge
              variant={
                user.role === "ADMIN" ? "rose" : user.role === "EXAMINER" ? "indigo" : "emerald"
              }
            >
              {user.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("account_profile_subtitle")}
          </p>
        </div>

        <Link href="/change-password">
          <Button
            variant="primary"
            size="sm"
            className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
          >
            <KeyRound className="h-4 w-4" /> {t("change_password_btn")}
          </Button>
        </Link>
      </div>

      {/* Main Profile Card */}
      <Card className="p-6 md:p-8 border-slate-800/80 bg-[#0D1322]/90 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-800/70">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-2xl shadow-inner">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-slate-300">
                <Mail className="h-3.5 w-3.5 text-indigo-400" /> {user.email}
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Shield className="h-3.5 w-3.5 text-indigo-400" /> Role: {user.role}
              </span>
              {user.registration_number && (
                <>
                  <span className="text-slate-600">&bull;</span>
                  <span className="font-mono font-semibold text-indigo-400">
                    Reg No: {user.registration_number}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-slate-400 font-semibold">{t("user_status")}</span>
            <div className="flex items-center gap-2 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="font-semibold text-white">{t("active_status")}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-slate-400 font-semibold">Security Architecture</span>
            <div className="flex items-center gap-2 pt-1">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-semibold text-white">Argon2id Hash Encryption (Stateless JWT)</span>
            </div>
          </div>

          {user.role === "STUDENT" && profileData && (
            <>
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-indigo-400" /> {t("college_institution")}
                </span>
                <p className="font-bold text-white pt-0.5">{profileData.college || "N/A"}</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-400" /> {t("course_degree")}
                </span>
                <p className="font-bold text-white pt-0.5">
                  {profileData.course || "N/A"} {profileData.specialization ? `(${profileData.specialization})` : ""}
                </p>
              </div>
            </>
          )}

          {user.role === "ADMIN" && (
            <>
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold">Administrative Scope</span>
                <p className="font-bold text-white pt-0.5">Full Platform Governance (RBAC Tier 1)</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Database className="h-3.5 w-3.5 text-indigo-400" /> Database Engine
                </span>
                <p className="font-mono font-bold text-white pt-0.5">PostgreSQL 17 / SQLAlchemy 2.0</p>
              </div>
            </>
          )}

          {user.role === "EXAMINER" && (
            <>
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold">Examiner Scope</span>
                <p className="font-bold text-white pt-0.5">Paper Generation & Evaluation Authority</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Database className="h-3.5 w-3.5 text-indigo-400" /> Repository Access
                </span>
                <p className="font-mono font-bold text-white pt-0.5">10,000+ Question Bank Catalog</p>
              </div>
            </>
          )}
        </div>

        {user.role === "STUDENT" && (
          <div className="mt-6 pt-4 border-t border-slate-800/70 flex justify-end">
            <Link href="/student/profile">
              <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200">
                <ExternalLink className="h-4 w-4" /> {t("my_account_profile")}
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
