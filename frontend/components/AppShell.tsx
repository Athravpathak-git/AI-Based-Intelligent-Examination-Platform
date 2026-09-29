"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Badge, Button } from "./UIComponents";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";
import {
  GraduationCap,
  Layers,
  BookOpen,
  Award,
  User as UserIcon,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  Calendar,
  ChevronDown,
  Bell,
  CheckCheck,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Eye
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Fetch real notifications for authenticated user
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get<NotificationItem[]>("/notifications");
      setNotifications(res.data);
    } catch {
      // Quiet fail if network/auth issues
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
      const handleSync = () => fetchNotifications();
      window.addEventListener("focus", handleSync);
      window.addEventListener("exam_platform_notification_sync", handleSync);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleSync);
        window.removeEventListener("exam_platform_notification_sync", handleSync);
      };
    }
  }, [user]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleMarkSingleRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // 1. Distraction-Free Mode: For active exam attempts, suppress entire shell
  const isExamAttempt = pathname?.includes("/attempt");
  if (isExamAttempt) {
    return <>{children}</>;
  }

  // 2. Public / Unauthenticated routes: Clean Deep Obsidian top Navbar + container
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (!user || isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100 bg-tech-grid">
        <header className="sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 shadow-md shadow-black/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg hover:opacity-95 transition-opacity">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white rounded-xl shadow-md shadow-indigo-500/25 border border-indigo-400/30">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="tracking-tight text-white font-extrabold text-lg">
                Intelli<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">ExamAI</span>
              </span>
            </Link>

            {/* Public Navigation */}
            <nav className="hidden sm:flex items-center gap-6 text-xs sm:text-sm font-semibold">
              <Link
                href="/"
                className={`transition-colors ${
                  pathname === "/" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {t("platform_overview")}
              </Link>
              {user && (
                <Link
                  href={user.role === "ADMIN" ? "/admin" : user.role === "EXAMINER" ? "/examiner" : "/student"}
                  className="text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1"
                >
                  {user.role === "ADMIN" ? t("admin") : user.role === "EXAMINER" ? t("examiner") : t("student")} &rarr;
                </Link>
              )}
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-semibold text-slate-200 hidden sm:inline">{user.name}</span>
                  <Badge variant={user.role === "ADMIN" ? "gold" : user.role === "EXAMINER" ? "indigo" : "emerald"}>
                    {user.role === "ADMIN" ? t("admin") : user.role === "EXAMINER" ? t("examiner") : t("student")}
                  </Badge>
                  <button
                    onClick={logout}
                    title={t("logout")}
                    className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800/60"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white">
                      {t("login")}
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      {t("register")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Unified Platform Footer */}
        <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-8 bg-[#090D16] text-xs text-slate-400 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white rounded-md">
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-white">IntelliExamAI</span>
              <span>{t("copyright_notice")}</span>
            </div>
            <div className="flex items-center gap-6 font-medium">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {t("systems_operational")}
              </span>
              <span>{t("proctoring_ai_grading")}</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // 3. Authenticated Top Navigation Layout (Student, Examiner, Admin)
  const navItems = (() => {
    switch (user.role) {
      case "STUDENT":
        return [
          { labelKey: "dashboard", href: "/student", icon: Layers },
          { labelKey: "my_exams", href: "/student/exams", icon: Calendar },
          { labelKey: "results", href: "/student/results", icon: Award },
          { labelKey: "performance", href: "/student/performance", icon: TrendingUp },
          { labelKey: "profile", href: "/student/profile", icon: UserIcon },
        ];
      case "EXAMINER":
        return [
          { labelKey: "dashboard", href: "/examiner", icon: Activity },
          { labelKey: "exams", href: "/examiner/exams", icon: Calendar },
          { labelKey: "live_monitoring", href: "/examiner/monitoring", icon: Eye },
          { labelKey: "question_bank", href: "/examiner/questions", icon: BookOpen },
          { labelKey: "valuation", href: "/examiner/evaluations", icon: Layers },
          { labelKey: "results", href: "/examiner/results", icon: Award },
          { labelKey: "notifications", href: "/notifications", icon: Bell, badge: unreadCount },
          { labelKey: "profile", href: "/profile", icon: UserIcon },
        ];
      case "ADMIN":
        return [
          { labelKey: "dashboard", href: "/admin", icon: Activity },
          { labelKey: "users", href: "/admin/users", icon: Users },
          { labelKey: "exams", href: "/admin/exams", icon: Calendar },
          { labelKey: "live_monitoring", href: "/admin/monitoring", icon: Eye },
          { labelKey: "question_bank", href: "/admin/questions", icon: BookOpen },
          { labelKey: "valuation", href: "/admin/evaluations", icon: Layers },
          { labelKey: "reports", href: "/admin/results", icon: Award },
          { labelKey: "notifications", href: "/notifications", icon: Bell, badge: unreadCount },
          { labelKey: "profile", href: "/profile", icon: UserIcon },
        ];
      default:
        return [];
    }
  })();

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100 bg-tech-grid">
      {/* ========================================================= */}
      {/* HORIZONTAL TOP NAVIGATION BAR (NO LEFT SIDEBAR)           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 shadow-md shadow-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Branding & Role Badge */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href={user.role === "ADMIN" ? "/admin" : user.role === "EXAMINER" ? "/examiner" : "/student"} className="flex items-center gap-2.5 font-bold text-base hover:opacity-95 transition-opacity">
                <div className="p-1.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white rounded-xl shadow-md shadow-indigo-500/25 border border-indigo-400/30">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="tracking-tight text-white font-extrabold text-base hidden sm:inline">
                  Intelli<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">ExamAI</span>
                </span>
              </Link>
              <Badge variant={user.role === "ADMIN" ? "gold" : user.role === "EXAMINER" ? "indigo" : "emerald"}>
                {user.role === "ADMIN" ? t("admin") : user.role === "EXAMINER" ? t("examiner") : t("student")}
              </Badge>
            </div>

            {/* Middle: Horizontal Nav Items (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-bold shadow-xs shadow-indigo-500/10"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>{t(item.labelKey)}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Actions (Language, Notification Bell, User Menu, Mobile Toggle) */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <LanguageSwitcher />

              {/* Notification Bell with Badge & Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!notifDropdownOpen) {
                      fetchNotifications();
                    }
                    setNotifDropdownOpen(!notifDropdownOpen);
                  }}
                  className="relative p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 rounded-xl transition-colors"
                  title={t("notifications")}
                  aria-label={t("notifications")}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0D1322] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{t("notifications")}</span>
                        {unreadCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {unreadCount} {t("new")}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            {t("all_read")}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="h-3 w-3" /> {t("mark_all_read")}
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">{t("no_notifications")}</div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition-colors hover:bg-slate-800/40 ${
                              !n.is_read ? "bg-indigo-950/20 font-medium" : "bg-[#0D1322]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!n.is_read ? (
                                  <span className="h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-transparent flex-shrink-0" />
                                )}
                                <span className="font-bold text-slate-100 truncate">{n.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatTimestamp(n.created_at)}
                                </span>
                                {!n.is_read && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleMarkSingleRead(n.id, e)}
                                    title={t("mark_as_read")}
                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 p-1 rounded hover:bg-slate-800"
                                  >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 pl-3.5">{n.message}</p>
                            {n.link && (
                              <div className="mt-1 pl-3.5">
                                <Link
                                  href={n.link}
                                  onClick={() => setNotifDropdownOpen(false)}
                                  className="text-[10px] font-bold text-indigo-400 hover:underline inline-flex items-center gap-1"
                                >
                                  {t("view_details")} &rarr;
                                </Link>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 text-center">
                      <Link
                        href="/notifications"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                      >
                        {t("view_all_notifications")} &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-800/60 rounded-xl transition-colors border border-transparent hover:border-slate-700"
                  aria-label="User profile menu"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#0D1322] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                      <div className="font-bold text-xs text-white truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      {user.registration_number && (
                        <div className="text-[10px] text-indigo-400 font-mono font-bold mt-1">
                          {t("registration_number")}: {user.registration_number}
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        href={user.role === "STUDENT" ? "/student/profile" : "/profile"}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-medium"
                      >
                        <UserIcon className="h-4 w-4 text-indigo-400" /> {t("my_account_profile")}
                      </Link>
                      <Link
                        href="/change-password"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-medium"
                      >
                        <Shield className="h-4 w-4 text-indigo-400" /> {t("change_password")}
                      </Link>
                    </div>

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/30 font-semibold text-left transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> {t("logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#090D16] px-4 py-3 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            <div className="pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {user.role === "ADMIN" ? t("admin") : user.role === "EXAMINER" ? t("examiner") : t("student")} {t("navigation_menu")}
              </span>
              <Badge variant={user.role === "ADMIN" ? "gold" : user.role === "EXAMINER" ? "indigo" : "emerald"}>
                {user.role === "ADMIN" ? t("admin") : user.role === "EXAMINER" ? t("examiner") : t("student")}
              </Badge>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-bold shadow-xs"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${active ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>{t(item.labelKey)}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-slate-800/60 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" /> {t("logout")}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* MAIN PAGE CONTENT (FULL WIDTH CONTAINER, NO EMPTY SIDEBAR) */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Unified Platform Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-8 bg-[#090D16] text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white rounded-md">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-white">IntelliExamAI</span>
            <span>{t("copyright_notice")}</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t("systems_operational")}
            </span>
            <span>{t("proctoring_ai_grading")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
