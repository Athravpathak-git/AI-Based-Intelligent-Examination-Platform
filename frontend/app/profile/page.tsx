"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, Button, Badge } from "@/components/UIComponents";
import {
  Mail,
  Shield,
  KeyRound,
  Lock,
  ExternalLink
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === "STUDENT") {
      setIsLoading(true);
      api
        .get("/profile")
        .then((res) => setProfileData(res.data))
        .catch((err) => console.error("Could not fetch extended profile:", err))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-12 text-center text-xs text-[#6B6B76]">
        Please log in to view your profile.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#1C1C1F] tracking-tight">Account & Credentials Profile</h1>
            <Badge
              variant={
                user.role === "ADMIN" ? "saffron" : user.role === "EXAMINER" ? "terracotta" : "emerald"
              }
            >
              {user.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B76] mt-1">
            Personal identity credentials, registered institutional affiliations, and cryptographic access keys.
          </p>
        </div>

        <Link href="/change-password">
          <Button variant="primary" size="sm" className="gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </Button>
        </Link>
      </div>

      {/* Main Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#EAE6DF]">
          <div className="h-16 w-16 rounded-2xl bg-[#E06A26] text-white flex items-center justify-center font-bold text-2xl border border-[#C95716] shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1C1C1F]">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B6B76]">
              <span className="flex items-center gap-1 font-mono">
                <Mail className="h-3.5 w-3.5 text-[#D97706]" /> {user.email}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-[#E06A26]" /> Role: {user.role}
              </span>
              {user.registration_number && (
                <>
                  <span>&bull;</span>
                  <span className="font-mono font-bold text-[#E06A26]">
                    Reg No: {user.registration_number}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
          <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
            <span className="text-[#6B6B76] font-semibold">Account Status</span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="h-2 w-2 rounded-full bg-[#2B7853]" />
              <span className="font-bold text-[#1C1C1F]">Active & Verified</span>
            </div>
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
            <span className="text-[#6B6B76] font-semibold">Security Level</span>
            <div className="flex items-center gap-2 pt-0.5">
              <Lock className="h-3.5 w-3.5 text-[#D97706]" />
              <span className="font-bold text-[#1C1C1F]">Argon2id Hash Encryption</span>
            </div>
          </div>

          {user.role === "STUDENT" && profileData && (
            <>
              <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="text-[#6B6B76] font-semibold">College / Institute</span>
                <p className="font-bold text-[#1C1C1F]">{profileData.college || "N/A"}</p>
              </div>

              <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="text-[#6B6B76] font-semibold">Academic Course</span>
                <p className="font-bold text-[#1C1C1F]">
                  {profileData.course || "N/A"} {profileData.specialization ? `(${profileData.specialization})` : ""}
                </p>
              </div>
            </>
          )}

          {user.role === "ADMIN" && (
            <>
              <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="text-[#6B6B76] font-semibold">Administrative Privileges</span>
                <p className="font-bold text-[#1C1C1F]">Full Platform Governance (RBAC Tier 1)</p>
              </div>

              <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="text-[#6B6B76] font-semibold">Database Engine</span>
                <p className="font-mono font-bold text-[#1C1C1F]">PostgreSQL 17 / SQLAlchemy 2.0</p>
              </div>
            </>
          )}

          {user.role === "EXAMINER" && (
            <>
              <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="text-[#6B6B76] font-semibold">Examiner Scope</span>
                <p className="font-bold text-[#1C1C1F]">Paper Generation & Evaluation Authority</p>
              </div>

              <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="text-[#6B6B76] font-semibold">Repository Access</span>
                <p className="font-mono font-bold text-[#1C1C1F]">10,000+ Question Bank Catalog</p>
              </div>
            </>
          )}
        </div>

        {user.role === "STUDENT" && (
          <div className="mt-6 pt-4 border-t border-[#EAE6DF] flex justify-end">
            <Link href="/student/profile">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" /> View Full 17-Field Student Profile
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
