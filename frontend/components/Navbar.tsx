"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Badge, Button } from "./UIComponents";
import { Sparkles, LogOut, GraduationCap } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#090D16]/90 border-b border-slate-800/80 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg hover:opacity-95">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.35)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="tracking-tight text-white font-extrabold">
            Intelli<span className="text-indigo-400">ExamAI</span>
          </span>
        </Link>

        {/* Navigation Links based on Role */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          {user?.role === "STUDENT" && (
            <>
              <Link
                href="/student"
                className={`transition-colors ${isActive("/student") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/student/results"
                className={`transition-colors ${isActive("/student/results") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                My Results
              </Link>
              <Link
                href="/student/profile"
                className={`transition-colors ${isActive("/student/profile") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                My Profile
              </Link>
            </>
          )}

          {user?.role === "EXAMINER" && (
            <>
              <Link
                href="/examiner"
                className={`transition-colors ${isActive("/examiner") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/examiner/questions"
                className={`transition-colors ${isActive("/examiner/questions") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Question Bank
              </Link>
              <Link
                href="/examiner/exams"
                className={`transition-colors ${isActive("/examiner/exams") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Exams
              </Link>
              <Link
                href="/examiner/results"
                className={`transition-colors ${isActive("/examiner/results") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Candidate Results
              </Link>
            </>
          )}

          {user?.role === "ADMIN" && (
            <>
              <Link
                href="/admin"
                className={`transition-colors ${isActive("/admin") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Analytics
              </Link>
              <Link
                href="/admin/users"
                className={`transition-colors ${isActive("/admin/users") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                User Management
              </Link>
              <Link
                href="/admin/exam-access"
                className={`transition-colors ${isActive("/admin/exam-access") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"}`}
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
                <span className="text-sm font-semibold text-white">{user.name}</span>
                {user.registration_number ? (
                  <span className="text-[11px] font-mono text-indigo-400 font-semibold">
                    {user.registration_number}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">{user.email}</span>
                )}
              </div>
              <Badge
                variant={
                  user.role === "ADMIN" ? "rose" : user.role === "EXAMINER" ? "indigo" : "emerald"
                }
              >
                {user.role}
              </Badge>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="py-2 px-3 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" className="py-2 px-3 text-xs bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold">
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
