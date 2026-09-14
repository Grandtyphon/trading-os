"use client";

import { cn } from "@/lib/utils";
import { formatDate as fmtDate } from "@/lib/calendar";
import { useAppStore } from "@/store/use-app-store";
import { formatNumber as fmtNum } from "@/lib/format";
import { useEffect, useRef, useState } from "react";

// Renders numbers/prices/R/dates always LTR within RTL Persian text.
export function Num({
  children,
  className,
  persian,
}: {
  children: React.ReactNode;
  className?: string;
  persian?: boolean;
}) {
  const digits = useAppStore((s) => s.persianDigits);
  const usePersian = persian ?? digits;
  // If string already formatted, optionally convert digits
  const content = usePersian && typeof children === "string"
    ? toPersian(children)
    : children;
  return (
    <span dir="ltr" className={cn("num inline-block", className)}>
      {content}
    </span>
  );
}

function toPersian(s: string): string {
  return s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

// LTR date that respects calendar mode
export function DateText({
  ts,
  withTime,
  className,
}: {
  ts: number;
  withTime?: boolean;
  className?: string;
}) {
  const mode = useAppStore((s) => s.calendarMode);
  const persian = useAppStore((s) => s.persianDigits);
  const str = fmtDate(ts, mode, { withTime, persianDigits: persian });
  return (
    <span dir="ltr" className={cn("num inline-block", className)}>
      {str}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/60 text-accent-foreground">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "gain" | "loss" | "gold" | "default";
  className?: string;
}) {
  const accentClass =
    accent === "gain"
      ? "text-emerald-500"
      : accent === "loss"
      ? "text-rose-500"
      : accent === "gold"
      ? "text-gold"
      : "text-foreground";
  const accentBg =
    accent === "gain"
      ? "from-emerald-500/5"
      : accent === "loss"
      ? "from-rose-500/5"
      : accent === "gold"
      ? "from-gold/5"
      : "from-transparent";
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-gradient-to-br to-card p-4 shadow-sm transition-all hover:border-gold/30 hover:shadow-md card-lift",
      accentBg,
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{label}</span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className={cn("mt-1.5 text-2xl font-extrabold tabular-nums count-up tracking-tight", accentClass)}>
        <Num>{value}</Num>
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// Skeleton loaders for loading states
export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl border bg-muted/40", className)} />;
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted/60" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="h-5 w-12 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-muted/20 p-4">
          <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
          <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

// Animated number that counts up when value changes
export function AnimatedNumber({
  value,
  duration = 600,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span dir="ltr" className={cn("num inline-block tabular-nums count-up", className)}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
