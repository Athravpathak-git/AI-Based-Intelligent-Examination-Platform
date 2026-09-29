"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Search, X, AlertCircle, CheckCircle2, AlertTriangle, Info, ChevronLeft, ChevronRight } from "lucide-react";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------
// BUTTONS
// ----------------------------------------------------
export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "gold" | "saffron" | "terracotta" | "champagne" | "mauve" | "danger" | "success" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}) {
  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-lg",
    md: "text-xs sm:text-sm px-4 py-2.5 rounded-xl",
    lg: "text-sm sm:text-base px-5 py-3 rounded-xl",
  };

  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080C14] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98]";

  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold shadow-md shadow-indigo-600/25 border border-indigo-400/30 focus:ring-indigo-500/50",
    secondary:
      "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-xs focus:ring-slate-500/50",
    gold:
      "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold hover:brightness-105 shadow-md shadow-amber-500/20 border border-amber-300/40 focus:ring-amber-500/50",
    saffron:
      "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold hover:brightness-105 shadow-md shadow-amber-500/20 border border-amber-300/40 focus:ring-amber-500/50",
    terracotta:
      "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-xs focus:ring-slate-500/50",
    champagne:
      "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold hover:brightness-105 shadow-md shadow-amber-500/20 border border-amber-300/40 focus:ring-amber-500/50",
    mauve:
      "bg-slate-800/80 text-indigo-300 hover:bg-slate-800 border border-indigo-500/30 focus:ring-indigo-500/40",
    danger:
      "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold shadow-md shadow-rose-900/30 border border-rose-400/30 focus:ring-rose-500/50",
    success:
      "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-md shadow-emerald-900/30 border border-emerald-400/30 focus:ring-emerald-500/50",
    outline:
      "border border-slate-700/80 text-slate-200 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-600 hover:text-white focus:ring-indigo-500/40 shadow-none font-semibold",
    ghost:
      "text-slate-400 hover:bg-slate-800/60 hover:text-white focus:ring-slate-700 shadow-none border-transparent",
  };

  return (
    <button
      className={cn(base, sizeStyles[size], variants[variant], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// ----------------------------------------------------
// CARDS
// ----------------------------------------------------
export function Card({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[#0D1322]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl text-slate-100",
        hover && "hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

// ----------------------------------------------------
// BADGES & STATUS BADGES
// ----------------------------------------------------
export function Badge({
  children,
  variant = "slate",
  className,
}: {
  children: React.ReactNode;
  variant?: "slate" | "gold" | "saffron" | "terracotta" | "burgundy" | "champagne" | "plum" | "mauve" | "emerald" | "amber" | "rose" | "indigo" | "purple" | "cyan" | "blue" | "success" | "warning" | "danger" | "info" | "neutral" | "graphite";
  className?: string;
}) {
  const variants: Record<string, string> = {
    slate: "bg-slate-800/80 text-slate-300 border-slate-700 font-medium",
    gold: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold",
    saffron: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold",
    terracotta: "bg-slate-800 text-indigo-300 border-slate-700 font-semibold",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold",
    neutral: "bg-slate-800 text-slate-400 border-slate-700",
    graphite: "bg-slate-900 text-indigo-300 border-slate-800 font-bold",
    // Standard system aliases
    burgundy: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-bold",
    champagne: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold",
    plum: "bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold",
    mauve: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-semibold",
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/30 font-semibold",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-semibold",
    blue: "bg-sky-500/10 text-sky-400 border-sky-500/30 font-semibold",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold",
    info: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-semibold",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide",
        variants[variant] || variants.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "UNKNOWN";
  if (s === "AVAILABLE" || s === "ACTIVE" || s === "PASS" || s === "COMPLETED" || s === "VERIFIED") {
    return <Badge variant="emerald">{status}</Badge>;
  }
  if (s === "UPCOMING" || s === "SCHEDULED" || s === "IN_PROGRESS" || s === "UNDER_REVIEW" || s === "PENDING") {
    return <Badge variant="amber">{status}</Badge>;
  }
  if (s === "FAIL" || s === "EXPIRED" || s === "DEACTIVATED" || s === "TERMINATED" || s === "CANCELLED") {
    return <Badge variant="rose">{status}</Badge>;
  }
  if (s === "RE_ATTEMPT" || s === "RE_ATTEMPT_AVAILABLE" || s === "REATTEMPT") {
    return <Badge variant="gold">{status}</Badge>;
  }
  return <Badge variant="slate">{status}</Badge>;
}

// ----------------------------------------------------
// STAT CARD
// ----------------------------------------------------
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "gold",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "gold" | "saffron" | "terracotta" | "emerald" | "amber" | "rose" | "slate" | "burgundy" | "champagne" | "plum" | "mauve" | "indigo" | "graphite" | "cyan";
  trend?: { label: string; positive?: boolean };
}) {
  const iconVariants: Record<string, string> = {
    gold: "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs",
    saffron: "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs",
    terracotta: "bg-slate-800 text-indigo-400 border border-slate-700 shadow-xs",
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs",
    rose: "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-xs",
    slate: "bg-slate-800 text-slate-300 border border-slate-700 shadow-xs",
    graphite: "bg-slate-800 text-indigo-300 border border-slate-700 shadow-xs",
    // Aliases
    burgundy: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-xs",
    champagne: "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs",
    plum: "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-xs",
    mauve: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-xs",
    indigo: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-xs",
    cyan: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-xs",
  };

  return (
    <div
      className="rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 p-5 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-[#0D1322]/90 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl shadow-xs", iconVariants[variant] || iconVariants.gold)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</div>
        <div className="flex items-center justify-between mt-1 gap-2">
          {subtitle && <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>}
          {trend && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                trend.positive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              )}
            >
              {trend.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// PAGE HEADER
// ----------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

// ----------------------------------------------------
// EMPTY, ERROR, LOADING STATES
// ----------------------------------------------------
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6 bg-[#0D1322]/50 border border-dashed border-slate-800 rounded-2xl space-y-4 shadow-xs">
      {Icon && (
        <div className="inline-flex p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "An error occurred while loading data",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-6 bg-rose-950/20 border border-rose-800/40 rounded-2xl text-center space-y-3">
      <div className="inline-flex p-2.5 rounded-full bg-rose-900/40 text-rose-400 border border-rose-700/50">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-rose-300 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="bg-slate-900 text-slate-200">
          Retry
        </Button>
      )}
    </div>
  );
}

export function Alert({
  children,
  type,
  variant,
  title,
  className,
}: {
  children: React.ReactNode;
  type?: "error" | "success" | "warning" | "info" | "danger";
  variant?: "error" | "success" | "warning" | "info" | "danger" | string;
  title?: string;
  className?: string;
}) {
  const key = variant === "danger" ? "error" : (variant || type || "error");
  const styles: Record<string, string> = {
    error: "bg-rose-950/30 border-rose-800/50 text-rose-300",
    danger: "bg-rose-950/30 border-rose-800/50 text-rose-300",
    success: "bg-emerald-950/30 border-emerald-800/50 text-emerald-300",
    warning: "bg-amber-950/30 border-amber-800/50 text-amber-300",
    info: "bg-indigo-950/30 border-indigo-800/50 text-indigo-300",
  };
  return (
    <div className={cn("p-4 rounded-xl border text-xs sm:text-sm font-medium", styles[key] || styles.error, className)}>
      {title && <div className="font-bold mb-1 text-sm text-white">{title}</div>}
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-slate-800/80 rounded-lg", className)} />;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "gold",
  className,
}: {
  value: number;
  max?: number;
  variant?: "gold" | "saffron" | "terracotta" | "emerald" | "amber" | "rose" | "burgundy" | "champagne" | "plum" | "mauve";
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const variants: Record<string, string> = {
    gold: "bg-gradient-to-r from-amber-500 to-amber-400",
    saffron: "bg-gradient-to-r from-amber-500 to-amber-400",
    terracotta: "bg-gradient-to-r from-indigo-500 to-cyan-400",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-400",
    amber: "bg-gradient-to-r from-amber-500 to-orange-400",
    rose: "bg-gradient-to-r from-rose-500 to-red-400",
    burgundy: "bg-gradient-to-r from-indigo-500 to-cyan-400",
    champagne: "bg-gradient-to-r from-amber-500 to-amber-400",
    plum: "bg-gradient-to-r from-rose-500 to-red-400",
    mauve: "bg-gradient-to-r from-indigo-500 to-cyan-400",
  };
  return (
    <div className={cn("h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50", className)}>
      <div
        className={cn("h-full transition-all duration-300 rounded-full", variants[variant] || variants.gold)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// ----------------------------------------------------
// TABS
// ----------------------------------------------------
export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; count?: number; icon?: React.ComponentType<{ className?: string }> }[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1 p-1 bg-[#0D1322] rounded-xl border border-slate-800 w-fit", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
              isActive
                ? "bg-indigo-600/20 text-indigo-300 shadow-xs font-bold border border-indigo-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            )}
          >
            {Icon && <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-400" : "text-slate-400")} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                  isActive ? "bg-indigo-500/30 text-indigo-200" : "bg-slate-800 text-slate-400 border border-slate-700"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------
// SEARCH INPUT & FILTERS
// ----------------------------------------------------
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 bg-[#0D1322] border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-md"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------
// MODAL & CONFIRM DIALOG
// ----------------------------------------------------
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-xl",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full bg-[#0D1322] rounded-2xl shadow-2xl border border-slate-800 p-6 space-y-4 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 text-slate-100",
            maxWidth
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
              {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={variant === "danger" ? "danger" : "primary"} size="sm" onClick={onConfirm} isLoading={isLoading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------
// PAGINATION
// ----------------------------------------------------
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
      <div className="text-slate-400 font-medium">
        {totalItems !== undefined && pageSize !== undefined ? (
          <span>
            Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong className="text-white">{Math.min(currentPage * pageSize, totalItems)}</strong> of{" "}
            <strong className="text-white">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
        </Button>
        <span className="px-3 py-1 bg-[#0D1322] border border-slate-800 rounded-lg font-mono font-bold text-indigo-400">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1"
        >
          Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
