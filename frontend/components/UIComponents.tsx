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
  variant?: "primary" | "secondary" | "saffron" | "terracotta" | "champagne" | "mauve" | "danger" | "success" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}) {
  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-lg",
    md: "text-xs sm:text-sm px-4 py-2.5 rounded-xl",
    lg: "text-sm sm:text-base px-5 py-3 rounded-xl",
  };

  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[#E06A26] text-white hover:bg-[#C95716] active:bg-[#B04B14] focus:ring-[#E06A26]/40 border border-[#E06A26] shadow-sm font-bold",
    secondary:
      "bg-[#1C1C1F] text-white hover:bg-[#25252A] active:bg-[#111112] focus:ring-[#1C1C1F]/40 border border-[#2F2F36]",
    saffron:
      "bg-[#E06A26] text-white hover:bg-[#C95716] active:bg-[#B04B14] focus:ring-[#E06A26]/40 border border-[#E06A26] shadow-sm font-bold",
    terracotta:
      "bg-[#C85332] text-white hover:bg-[#B04426] active:bg-[#9B391E] focus:ring-[#C85332]/40 border border-[#C85332] shadow-sm font-bold",
    champagne:
      "bg-[#E06A26] text-white hover:bg-[#C95716] active:bg-[#B04B14] focus:ring-[#E06A26]/40 border border-[#E06A26] shadow-sm font-bold",
    mauve:
      "bg-[#FEF3EC] text-[#E06A26] hover:bg-[#FAD9C5] focus:ring-[#E06A26]/40 border border-[#FAD9C5] font-semibold",
    danger:
      "bg-[#C85332] text-white hover:bg-[#8E333F] focus:ring-[#C85332]/40 border border-[#C85332] shadow-rose-200",
    success:
      "bg-[#2B7853] text-white hover:bg-[#236344] focus:ring-[#2B7853]/40 border border-[#2B7853] font-semibold",
    outline:
      "border border-[#EAE6DF] text-[#1C1C1F] bg-white hover:bg-[#FAF8F5] hover:border-[#E06A26]/50 focus:ring-[#E06A26]/20 shadow-none font-semibold",
    ghost:
      "text-[#6B6B76] hover:bg-[#FEF3EC] hover:text-[#E06A26] focus:ring-[#E06A26]/20 shadow-none border-transparent",
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
        "bg-white border border-[#EAE6DF] rounded-2xl p-6 shadow-sm",
        hover && "hover:shadow-md hover:border-[#E06A26]/40 transition-all duration-200",
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
  variant?: "slate" | "saffron" | "terracotta" | "burgundy" | "champagne" | "plum" | "mauve" | "emerald" | "amber" | "rose" | "indigo" | "purple" | "cyan" | "blue" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}) {
  const variants: Record<string, string> = {
    slate: "bg-[#F5F3EF] text-[#6B6B76] border-[#EAE6DF] font-medium",
    saffron: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5] font-bold",
    terracotta: "bg-[#F8DDD5] text-[#C85332] border-[#F2C2B5] font-semibold",
    emerald: "bg-[#EFF7F2] text-[#2B7853] border-[#C4DFD3] font-semibold",
    amber: "bg-[#FEF7EC] text-[#D97706] border-[#FDE68A] font-semibold",
    rose: "bg-[#FEF3EC] text-[#C85332] border-[#F8DDD5] font-semibold",
    neutral: "bg-[#F5F3EF] text-[#6B6B76] border-[#EAE6DF]",
    // Aliases to eliminate old colors
    burgundy: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5] font-bold",
    champagne: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5] font-semibold",
    plum: "bg-[#F8DDD5] text-[#C85332] border-[#F2C2B5] font-semibold",
    mauve: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5]",
    indigo: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5]",
    purple: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5]",
    cyan: "bg-[#EFF7F2] text-[#2B7853] border-[#C4DFD3]",
    blue: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5]",
    success: "bg-[#EFF7F2] text-[#2B7853] border-[#C4DFD3] font-semibold",
    warning: "bg-[#FEF7EC] text-[#D97706] border-[#FDE68A] font-semibold",
    danger: "bg-[#FEF3EC] text-[#C85332] border-[#F8DDD5] font-semibold",
    info: "bg-[#FEF3EC] text-[#E06A26] border-[#FAD9C5]",
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
    return <Badge variant="saffron">{status}</Badge>;
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
  variant = "saffron",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "saffron" | "terracotta" | "emerald" | "amber" | "rose" | "slate" | "burgundy" | "champagne" | "plum" | "mauve" | "indigo";
  trend?: { label: string; positive?: boolean };
}) {
  const iconVariants: Record<string, string> = {
    saffron: "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]",
    terracotta: "bg-[#F8DDD5] text-[#C85332] border border-[#F2C2B5]",
    emerald: "bg-[#EFF7F2] text-[#2B7853] border border-[#C4DFD3]",
    amber: "bg-[#FEF7EC] text-[#D97706] border border-[#FDE68A]",
    rose: "bg-[#FEF3EC] text-[#C85332] border border-[#F8DDD5]",
    slate: "bg-[#F5F3EF] text-[#6B6B76] border border-[#EAE6DF]",
    // Aliases
    burgundy: "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]",
    champagne: "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]",
    plum: "bg-[#F8DDD5] text-[#C85332] border border-[#F2C2B5]",
    mauve: "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]",
    indigo: "bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]",
  };

  return (
    <div
      className="rounded-2xl border border-[#EAE6DF] hover:border-[#E06A26]/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-white"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#6B6B76] uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl shadow-xs", iconVariants[variant] || iconVariants.saffron)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1F] tracking-tight">{value}</div>
        <div className="flex items-center justify-between mt-1 gap-2">
          {subtitle && <p className="text-[11px] text-[#6B6B76] font-medium">{subtitle}</p>}
          {trend && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                trend.positive ? "bg-[#EFF7F2] text-[#2B7853]" : "bg-[#FEF3EC] text-[#C85332]"
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF] mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1C1F] tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-[#6B6B76]">{subtitle}</p>}
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
    <div className="text-center py-12 px-6 bg-white border border-dashed border-[#EAE6DF] rounded-2xl space-y-4 shadow-sm">
      {Icon && (
        <div className="inline-flex p-3.5 rounded-2xl bg-[#FEF3EC] text-[#E06A26] border border-[#FAD9C5]">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-sm sm:text-base font-bold text-[#1C1C1F]">{title}</h3>
        <p className="text-xs text-[#6B6B76] leading-relaxed">{description}</p>
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
    <div className="p-6 bg-[#FEF3EC] border border-[#F8DDD5] rounded-2xl text-center space-y-3">
      <div className="inline-flex p-2.5 rounded-full bg-white text-[#C85332] border border-[#F8DDD5]">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-[#C85332] max-w-md mx-auto">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="bg-white">
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
    error: "bg-[#FEF3EC] border-[#F8DDD5] text-[#C85332]",
    danger: "bg-[#FEF3EC] border-[#F8DDD5] text-[#C85332]",
    success: "bg-[#EFF7F2] border-[#C4DFD3] text-[#2B7853]",
    warning: "bg-[#FEF7EC] border-[#FDE68A] text-[#D97706]",
    info: "bg-[#FEF3EC] border-[#FAD9C5] text-[#E06A26]",
  };
  return (
    <div className={cn("p-4 rounded-xl border text-xs sm:text-sm font-medium", styles[key] || styles.error, className)}>
      {title && <div className="font-bold mb-1 text-sm">{title}</div>}
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-stone-200/80 rounded-lg", className)} />;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "saffron",
  className,
}: {
  value: number;
  max?: number;
  variant?: "saffron" | "terracotta" | "emerald" | "amber" | "rose" | "burgundy" | "champagne" | "plum" | "mauve";
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const variants: Record<string, string> = {
    saffron: "bg-[#E06A26]",
    terracotta: "bg-[#C85332]",
    emerald: "bg-[#2B7853]",
    amber: "bg-[#D97706]",
    rose: "bg-[#C85332]",
    burgundy: "bg-[#E06A26]",
    champagne: "bg-[#E06A26]",
    plum: "bg-[#C85332]",
    mauve: "bg-[#E06A26]",
  };
  return (
    <div className={cn("h-2 w-full bg-[#F5F3EF] rounded-full overflow-hidden border border-[#EAE6DF]/60", className)}>
      <div
        className={cn("h-full transition-all duration-300 rounded-full", variants[variant] || variants.saffron)}
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
    <div className={cn("flex flex-wrap gap-1 p-1 bg-[#F0ECE3]/60 rounded-xl border border-[#EAE6DF] w-fit", className)}>
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
                ? "bg-[#E06A26] text-white shadow-sm font-bold"
                : "text-[#6B6B76] hover:text-[#1C1C1F] hover:bg-white/80"
            )}
          >
            {Icon && <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-[#E06A26]")} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-white text-[#6B6B76] border border-[#EAE6DF]"
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
      <Search className="absolute left-3 h-4 w-4 text-[#E06A26] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 bg-white border border-[#EAE6DF] rounded-xl text-xs sm:text-sm text-[#1C1C1F] placeholder-[#6B6B76] focus:outline-none focus:ring-2 focus:ring-[#E06A26]/30 focus:border-[#E06A26] transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 p-1 text-[#6B6B76] hover:text-[#1C1C1F] rounded-md"
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
      <div className="fixed inset-0 bg-[#171719]/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full bg-white rounded-2xl shadow-xl border border-[#EAE6DF] p-6 space-y-4 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150",
            maxWidth
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1C1C1F]">{title}</h3>
              {description && <p className="text-xs text-[#6B6B76] mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B6B76] hover:text-[#1C1C1F] rounded-lg hover:bg-[#FAF8F5]"
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
      <p className="text-xs sm:text-sm text-[#6B6B76] leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAE6DF]">
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#EAE6DF] text-xs">
      <div className="text-[#6B6B76] font-medium">
        {totalItems !== undefined && pageSize !== undefined ? (
          <span>
            Showing <strong className="text-[#1C1C1F]">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong className="text-[#1C1C1F]">{Math.min(currentPage * pageSize, totalItems)}</strong> of{" "}
            <strong className="text-[#1C1C1F]">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-[#1C1C1F]">{currentPage}</strong> of <strong className="text-[#1C1C1F]">{totalPages}</strong>
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
        <span className="px-3 py-1 bg-white border border-[#EAE6DF] rounded-lg font-mono font-bold text-[#E06A26]">
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
