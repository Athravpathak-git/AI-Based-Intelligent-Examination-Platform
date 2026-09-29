"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card, Button, Alert } from "@/components/UIComponents";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  ShieldAlert,
  Calendar,
  FileText,
  KeyRound,
  Info,
  RefreshCw,
  Sparkles
} from "lucide-react";

interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications =
    filter === "UNREAD" ? notifications.filter((n) => !n.is_read) : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "REATTEMPT_REQUEST":
      case "REATTEMPT_APPROVED":
      case "REATTEMPT_REJECTED":
        return <KeyRound className="h-4 w-4 text-amber-400" />;
      case "PROCTORING_ALERT":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case "EXAM_SUBMISSION":
      case "EXAM_COMPLETED":
      case "RESULT_PUBLISHED":
        return <FileText className="h-4 w-4 text-emerald-400" />;
      case "EXAM_SCHEDULED":
      case "EXAM_REGISTERED":
        return <Calendar className="h-4 w-4 text-cyan-400" />;
      default:
        return <Info className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <Bell className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t("system_notifications_title")}
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {unreadCount} {t("unread")}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time audit telemetry for exam scheduling, re-attempt approvals, proctor alerts, and valuation notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="gap-1.5 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            >
              <CheckCheck className="h-4 w-4 text-indigo-400" />
              {isMarkingAll ? "..." : t("mark_all_read")}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={fetchNotifications}
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "ALL"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {t("all_exams")} ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "UNREAD"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {t("unread")} ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <Card className="p-0 overflow-hidden border-slate-800/80 bg-[#0D1322]/90 shadow-xl backdrop-blur-md">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-3"></div>
            Loading audit notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-2">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-white">
              {filter === "UNREAD" ? t("unread") : t("no_notifications")}
            </p>
            <p className="text-xs text-slate-400">
              {t("no_notifications_desc")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 transition-colors flex items-start justify-between gap-4 ${
                  n.is_read
                    ? "bg-transparent hover:bg-slate-800/30"
                    : "bg-indigo-950/20 hover:bg-indigo-950/30 border-l-2 border-l-indigo-500"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)] inline-block" title="Unread" />
                      )}
                      <span className="text-[10px] py-0.5 px-2 rounded-md font-mono bg-slate-800/70 text-slate-400 border border-slate-700/60">
                        {n.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline flex items-center gap-1"
                        >
                          {t("view_details")} <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!n.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="flex-shrink-0 text-xs py-1 px-3 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    {t("mark_as_read")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
