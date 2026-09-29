"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border text-sm backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-[#0D1322]/95 border-emerald-500/30 text-emerald-200 shadow-emerald-500/10"
              : toast.type === "error"
              ? "bg-[#0D1322]/95 border-rose-500/30 text-rose-200 shadow-rose-500/10"
              : "bg-[#0D1322]/95 border-indigo-500/30 text-indigo-200 shadow-indigo-500/10"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === "info" && <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />}
          
          <div className="flex-1 font-medium text-xs leading-relaxed">{toast.message}</div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white shrink-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
