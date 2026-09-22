"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  ShieldAlert,
  Calendar,
  FileText,
  KeyRound,
  Info
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
        return <KeyRound className="h-5 w-5 text-[#D97706]" />;
      case "PROCTORING_ALERT":
        return <ShieldAlert className="h-5 w-5 text-[#C85332]" />;
      case "EXAM_SUBMISSION":
      case "EXAM_COMPLETED":
      case "RESULT_PUBLISHED":
        return <FileText className="h-5 w-5 text-[#2B7853]" />;
      case "EXAM_SCHEDULED":
      case "EXAM_REGISTERED":
        return <Calendar className="h-5 w-5 text-[#E06A26]" />;
      default:
        return <Info className="h-5 w-5 text-[#E06A26]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#1C1C1F] tracking-tight">System & Event Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="saffron">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B76] mt-1">
            Real-time audit log notifications for exam approvals, valuation updates, and system announcements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4 text-[#D97706]" />
              {isMarkingAll ? "Updating..." : "Mark All Read"}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={fetchNotifications} className="gap-1.5">
            Refresh
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
                ? "bg-[#E06A26] text-white shadow-xs"
                : "bg-white border border-[#EAE6DF] text-[#6B6B76] hover:text-[#1C1C1F]"
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "UNREAD"
                ? "bg-[#E06A26] text-white shadow-xs"
                : "bg-white border border-[#EAE6DF] text-[#6B6B76] hover:text-[#1C1C1F]"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <Card className="p-0 overflow-hidden border-[#EAE6DF]">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6B6B76]">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="h-8 w-8 mx-auto text-[#D97706]" />
            <p className="text-sm font-bold text-[#1C1C1F]">
              {filter === "UNREAD" ? "No unread notifications" : "No notifications on record"}
            </p>
            <p className="text-xs text-[#6B6B76]">
              Event notifications generated from exam registrations and valuation workflows will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE6DF]">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 transition-colors flex items-start justify-between gap-4 ${
                  n.is_read ? "bg-white" : "bg-[#FAF8F5]/80"
                } hover:bg-[#FAF8F5]`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-white border border-[#EAE6DF] rounded-xl shadow-xs flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1C1C1F]">{n.title}</h3>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#E06A26] inline-block" title="Unread" />
                      )}
                      <Badge variant="slate" className="text-[10px] py-0 px-1.5 font-mono">
                        {n.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B6B76] leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-[#6B6B76]">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-[#E06A26] font-semibold hover:underline flex items-center gap-1"
                        >
                          View Details <ExternalLink className="h-3 w-3" />
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
                    className="flex-shrink-0 text-xs py-1 px-2.5 text-[#6B6B76] border-[#EAE6DF]"
                  >
                    Mark Read
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
