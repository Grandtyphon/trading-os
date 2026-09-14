"use client";

import { useMemo } from "react";
import { useAppStore, type DateRangePreset } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { CalendarRange, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import moment from "jalali-moment";
import { useState } from "react";

const PRESETS: { value: DateRangePreset; label: string; labelEn: string }[] = [
  { value: "7d", label: "۷ روز اخیر", labelEn: "7d" },
  { value: "30d", label: "۳۰ روز اخیر", labelEn: "30d" },
  { value: "90d", label: "۹۰ روز اخیر", labelEn: "90d" },
  { value: "ytd", label: "امسال", labelEn: "YTD" },
  { value: "all", label: "همه", labelEn: "All" },
  { value: "custom", label: "بازه دلخواه", labelEn: "Custom" },
];

// Compute the actual [start, end] ms window from the active preset/range
export function useDateRangeWindow(): { start: number | null; end: number | null; label: string } {
  const preset = useAppStore((s) => s.dateRangePreset);
  const customStart = useAppStore((s) => s.dateRangeStart);
  const customEnd = useAppStore((s) => s.dateRangeEnd);

  return useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    switch (preset) {
      case "7d":
        return { start: now - 7 * day, end: now, label: "۷ روز اخیر" };
      case "30d":
        return { start: now - 30 * day, end: now, label: "۳۰ روز اخیر" };
      case "90d":
        return { start: now - 90 * day, end: now, label: "۹۰ روز اخیر" };
      case "ytd": {
        const yStart = moment().startOf("year").valueOf();
        return { start: yStart, end: now, label: "امسال" };
      }
      case "custom":
        return {
          start: customStart,
          end: customEnd,
          label:
            customStart && customEnd
              ? `${moment(customStart).format("jYY/jMM/jDD")} - ${moment(customEnd).format("jYY/jMM/jDD")}`
              : "بازه دلخواه",
        };
      case "all":
      default:
        return { start: null, end: null, label: "همه" };
    }
  }, [preset, customStart, customEnd]);
}

export function filterByDateRange<T extends { openedAt: number }>(
  items: T[],
  start: number | null,
  end: number | null
): T[] {
  if (start === null && end === null) return items;
  return items.filter((t) => {
    if (start !== null && t.openedAt < start) return false;
    if (end !== null && t.openedAt > end) return false;
    return true;
  });
}

export function DateRangeFilter({ compact }: { compact?: boolean }) {
  const preset = useAppStore((s) => s.dateRangePreset);
  const setPreset = useAppStore((s) => s.setDateRangePreset);
  const setDateRange = useAppStore((s) => s.setDateRange);
  const customStart = useAppStore((s) => s.dateRangeStart);
  const customEnd = useAppStore((s) => s.dateRangeEnd);
  const calendarMode = useAppStore((s) => s.calendarMode);
  const [open, setOpen] = useState(false);

  const activeLabel = PRESETS.find((p) => p.value === preset)?.label ?? "همه";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            preset !== "all" && "border-gold/40 bg-gold/10 text-gold"
          )}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          <span className="text-xs">{activeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">بازه زمانی</div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPreset(p.value);
                if (p.value !== "custom") setOpen(false);
              }}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                preset === p.value
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">از تاریخ</Label>
              <Input
                type="date"
                dir="ltr"
                className="text-left text-xs"
                value={customStart ? moment(customStart).format("YYYY-MM-DD") : ""}
                onChange={(e) => {
                  const m = moment(e.target.value, "YYYY-MM-DD");
                  if (m.isValid()) setDateRange(m.valueOf(), customEnd);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">تا تاریخ</Label>
              <Input
                type="date"
                dir="ltr"
                className="text-left text-xs"
                value={customEnd ? moment(customEnd).format("YYYY-MM-DD") : ""}
                onChange={(e) => {
                  const m = moment(e.target.value, "YYYY-MM-DD");
                  if (m.isValid()) setDateRange(customStart, m.endOf("day").valueOf());
                }}
              />
            </div>
          </div>
        )}

        {preset !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-center gap-1.5 text-xs text-muted-foreground"
            onClick={() => {
              setPreset("all");
              setOpen(false);
            }}
          >
            <X className="h-3 w-3" />
            حذف فیلتر
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
