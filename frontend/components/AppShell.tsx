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
  ExternalLink
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

  // 2. Public / Unauthenticated routes: Clean Warm Ivory top Navbar + centered container
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (!user || isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE6DF] shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg hover:opacity-95 transition-opacity">
              <div className="p-2 bg-[#E06A26] text-white rounded-xl shadow-xs border border-[#C95716]">
                <GraduationCap className="h-5 w-5 text-[#FAF8F5]" />
              </div>
              <span className="tracking-tight text-[#1C1C1F] font-extrabold text-lg">
                Intelli<span className="text-[#E06A26]">ExamAI</span>
              </span>
            </Link>

            {/* Public Navigation */}
            <nav className="hidden sm:flex items-center gap-6 text-xs sm:text-sm font-semibold">
              <Link
                href="/"
                className={`transition-colors ${
                  pathname === "/" ? "text-[#E06A26] font-bold" : "text-[#6B6B76] hover:text-[#1C1C1F]"
                }`}
              >
                Platform Overview
              </Link>
              {user && (
                <Link
                  href={user.role === "ADMIN" ? "/admin" : user.role === "EXAMINER" ? "/examiner" : "/student"}
                  className="text-[#E06A26] font-bold hover:text-[#C95716] flex items-center gap-1"
                >
                  Go to {user.role === "ADMIN" ? "Admin Console" : user.role === "EXAMINER" ? "Examiner Portal" : "Student Dashboard"} &rarr;
                </Link>
              )}
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-semibold text-[#1C1C1F] hidden sm:inline">{user.name}</span>
                  <Badge variant={user.role === "ADMIN" ? "saffron" : user.role === "EXAMINER" ? "terracotta" : "emerald"}>
                    {user.role}
                  </Badge>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 text-[#6B6B76] hover:text-[#C85332] transition-colors rounded-lg hover:bg-[#FEF3EC]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm">
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
        <footer className="border-t border-[#EAE6DF] py-6 px-4 sm:px-8 bg-white/70 backdrop-blur-xs text-xs text-[#6B6B76]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-[#E06A26] text-white rounded-md">
                <GraduationCap className="h-3.5 w-3.5 text-[#FAF8F5]" />
              </div>
              <span className="font-bold text-[#1C1C1F]">IntelliExamAI</span>
              <span>&copy; 2026 Intelligent Examination Platform. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 font-medium">
              <span className="inline-flex items-center gap-1.5 text-[#2B7853]">
                <span className="h-2 w-2 rounded-full bg-[#2B7853]"></span>
                Systems Operational
              </span>
              <span>Automated Proctoring &bull; AI Grading</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // 3. Authenticated Top Navigation Layout (Student, Examiner, Admin)
  // Strictly NO Live Monitoring in navigation as requested
  const navItems = (() => {
    switch (user.role) {
      case "STUDENT":
        return [
          { label: "Dashboard", href: "/student", icon: Layers },
          { label: "My Exams", href: "/student/exams", icon: Calendar },
          { label: "Results", href: "/student/results", icon: Award },
          { label: "Performance", href: "/student/performance", icon: TrendingUp },
          { label: "Profile", href: "/student/profile", icon: UserIcon },
        ];
      case "EXAMINER":
        return [
          { label: "Dashboard", href: "/examiner", icon: Activity },
          { label: "Exams", href: "/examiner/exams", icon: Calendar },
          { label: "Question Bank", href: "/examiner/questions", icon: BookOpen },
          { label: "Valuation", href: "/examiner/evaluations", icon: Layers },
          { label: "Results", href: "/examiner/results", icon: Award },
          { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
          { label: "Profile", href: "/profile", icon: UserIcon },
        ];
      case "ADMIN":
        return [
          { label: "Dashboard", href: "/admin", icon: Activity },
          { label: "Users", href: "/admin/users", icon: Users },
          { label: "Exams", href: "/admin/exams", icon: Calendar },
          { label: "Question Bank", href: "/admin/questions", icon: BookOpen },
          { label: "Valuation", href: "/admin/evaluations", icon: Layers },
          { label: "Reports", href: "/admin/results", icon: Award },
          { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
          { label: "Profile", href: "/profile", icon: UserIcon },
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
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* ========================================================= */}
      {/* HORIZONTAL TOP NAVIGATION BAR (NO LEFT SIDEBAR)           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE6DF] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Branding & Role Badge */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href={user.role === "ADMIN" ? "/admin" : user.role === "EXAMINER" ? "/examiner" : "/student"} className="flex items-center gap-2.5 font-bold text-base hover:opacity-95 transition-opacity">
                <div className="p-1.5 bg-[#E06A26] text-white rounded-xl shadow-xs border border-[#C95716]">
                  <GraduationCap className="h-5 w-5 text-[#FAF8F5]" />
                </div>
                <span className="tracking-tight text-[#1C1C1F] font-extrabold text-base hidden sm:inline">
                  Intelli<span className="text-[#E06A26]">ExamAI</span>
                </span>
              </Link>
              <Badge variant={user.role === "ADMIN" ? "saffron" : user.role === "EXAMINER" ? "terracotta" : "emerald"}>
                {user.role === "ADMIN" ? "Admin" : user.role === "EXAMINER" ? "Examiner" : "Student"}
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
                        ? "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5] font-bold shadow-xs"
                        : "text-[#6B6B76] hover:text-[#1C1C1F] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-[#E06A26]" : "text-[#8E8E93]"}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E06A26] text-white">
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
                  className="relative p-2 text-[#6B6B76] hover:text-[#E06A26] hover:bg-[#FAF8F5] rounded-xl transition-colors"
                  title="Notifications"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#E06A26] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#EAE6DF] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 bg-[#FAF8F5] border-b border-[#EAE6DF] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1C1C1F]">Notifications</span>
                        {unreadCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E06A26] text-white">
                            {unreadCount} new
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF8F5] text-[#6B6B76] border border-[#EAE6DF]">
                            All read
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-[#E06A26] hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="h-3 w-3" /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-[#EAE6DF]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#6B6B76]">No notifications on record</div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition-colors hover:bg-[#FAF8F5] ${
                              !n.is_read ? "bg-[#FEF3EC]/40 font-medium" : "bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!n.is_read ? (
                                  <span className="h-2 w-2 rounded-full bg-[#E06A26] flex-shrink-0" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-transparent flex-shrink-0" />
                                )}
                                <span className="font-bold text-[#1C1C1F] truncate">{n.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] text-[#6B6B76] font-mono">
                                  {formatTimestamp(n.created_at)}
                                </span>
                                {!n.is_read && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleMarkSingleRead(n.id, e)}
                                    title="Mark as read"
                                    className="text-[11px] text-[#E06A26] hover:text-[#C95716] font-semibold flex items-center gap-0.5 p-1 rounded hover:bg-white"
                                  >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-[#6B6B76] line-clamp-2 mt-0.5 pl-3.5">{n.message}</p>
                            {n.link && (
                              <div className="mt-1 pl-3.5">
                                <Link
                                  href={n.link}
                                  onClick={() => setNotifDropdownOpen(false)}
                                  className="text-[10px] font-bold text-[#E06A26] hover:underline inline-flex items-center gap-1"
                                >
                                  View Details &rarr;
                                </Link>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 bg-[#FAF8F5] border-t border-[#EAE6DF] text-center">
                      <Link
                        href="/notifications"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs font-bold text-[#E06A26] hover:underline"
                      >
                        View All Notifications &rarr;
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
                  className="flex items-center gap-2 p-1.5 hover:bg-[#FAF8F5] rounded-xl transition-colors border border-transparent hover:border-[#EAE6DF]"
                  aria-label="User profile menu"
                >
                  <div className="h-7 w-7 rounded-lg bg-[#E06A26] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-[#1C1C1F] hidden md:inline max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#6B6B76]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-[#EAE6DF] rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-[#EAE6DF] bg-[#FAF8F5]">
                      <div className="font-bold text-xs text-[#1C1C1F] truncate">{user.name}</div>
                      <div className="text-[11px] text-[#6B6B76] truncate">{user.email}</div>
                      {user.registration_number && (
                        <div className="text-[10px] text-[#E06A26] font-mono font-bold mt-1">
                          Reg: {user.registration_number}
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        href={user.role === "STUDENT" ? "/student/profile" : "/profile"}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#1C1C1F] hover:bg-[#FAF8F5] font-medium"
                      >
                        <UserIcon className="h-4 w-4 text-[#E06A26]" /> Account Profile
                      </Link>
                      <Link
                        href="/change-password"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#1C1C1F] hover:bg-[#FAF8F5] font-medium"
                      >
                        <Shield className="h-4 w-4 text-[#E06A26]" /> Change Password
                      </Link>
                    </div>

                    <div className="border-t border-[#EAE6DF] pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#C85332] hover:bg-[#FEF3EC] font-semibold text-left transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[#6B6B76] hover:text-[#1C1C1F] hover:bg-[#FAF8F5] rounded-xl transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#EAE6DF] bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="pb-2 mb-2 border-b border-[#EAE6DF] flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6B6B76] uppercase tracking-wider">
                {user.role} Navigation
              </span>
              <Badge variant={user.role === "ADMIN" ? "saffron" : user.role === "EXAMINER" ? "terracotta" : "emerald"}>
                {user.role}
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
                      ? "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5] font-bold"
                      : "text-[#1C1C1F] hover:bg-[#FAF8F5]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${active ? "text-[#E06A26]" : "text-[#6B6B76]"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E06A26] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-[#EAE6DF]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#C85332] hover:bg-[#FEF3EC] rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign Out
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
      <footer className="border-t border-[#EAE6DF] py-6 px-4 sm:px-8 bg-white/70 backdrop-blur-xs text-xs text-[#6B6B76] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#E06A26] text-white rounded-md">
              <GraduationCap className="h-3.5 w-3.5 text-[#FAF8F5]" />
            </div>
            <span className="font-bold text-[#1C1C1F]">IntelliExamAI</span>
            <span>&copy; 2026 Intelligent Examination Platform. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <span className="inline-flex items-center gap-1.5 text-[#2B7853]">
              <span className="h-2 w-2 rounded-full bg-[#2B7853]"></span>
              Systems Operational
            </span>
            <span>Automated Proctoring &bull; AI Grading</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
