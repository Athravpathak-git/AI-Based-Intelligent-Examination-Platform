"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Badge, Button } from "./UIComponents";
import { GraduationCap, LogOut, BookOpen, Layers, User as UserIcon, Shield, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#E06A26] hover:opacity-90">
          <div className="p-2 bg-[#E06A26] text-white rounded-xl shadow-sm">
            <GraduationCap className="h-5 w-5 text-[#F3EBDD]" />
          </div>
          <span className="tracking-tight text-stone-900 font-extrabold">
            Intelli<span className="text-[#E06A26]">ExamAI</span>
          </span>
        </Link>

        {/* Navigation Links based on Role */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          {user?.role === "STUDENT" && (
            <>
              <Link
                href="/student"
                className={`transition-colors ${isActive("/student") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/student/results"
                className={`transition-colors ${isActive("/student/results") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                My Results
              </Link>
              <Link
                href="/student/profile"
                className={`transition-colors ${isActive("/student/profile") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                My Profile
              </Link>
            </>
          )}

          {user?.role === "EXAMINER" && (
            <>
              <Link
                href="/examiner"
                className={`transition-colors ${isActive("/examiner") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/examiner/questions"
                className={`transition-colors ${isActive("/examiner/questions") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Question Bank
              </Link>
              <Link
                href="/examiner/exams"
                className={`transition-colors ${isActive("/examiner/exams") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Exams
              </Link>
              <Link
                href="/examiner/results"
                className={`transition-colors ${isActive("/examiner/results") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Candidate Results
              </Link>
            </>
          )}

          {user?.role === "ADMIN" && (
            <>
              <Link
                href="/admin"
                className={`transition-colors ${isActive("/admin") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Analytics
              </Link>
              <Link
                href="/admin/users"
                className={`transition-colors ${isActive("/admin/users") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                User Management
              </Link>
              <Link
                href="/admin/exam-access"
                className={`transition-colors ${isActive("/admin/exam-access") ? "text-[#E06A26] font-semibold" : "text-stone-600 hover:text-stone-900"}`}
              >
                Re-Attempt Access
              </Link>
            </>
          )}
        </nav>

        {/* User Info / Auth Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-stone-800">{user.name}</span>
                {user.registration_number ? (
                  <span className="text-[11px] font-mono text-[#E06A26] font-semibold">
                    {user.registration_number}
                  </span>
                ) : (
                  <span className="text-xs text-stone-500">{user.email}</span>
                )}
              </div>
              <Badge
                variant={
                  user.role === "ADMIN" ? "burgundy" : user.role === "EXAMINER" ? "champagne" : "emerald"
                }
              >
                {user.role}
              </Badge>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="py-2 px-3 text-xs">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" className="py-2 px-3 text-xs">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
