"use client";

import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Plus, CalendarDays, Bot, Sparkles, FileText, Grid3x3, BookHeart, ChevronLeft,
} from "lucide-react";
import type { SectionId } from "@/store/use-app-store";

interface QuickAction {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  accent: string;
}

const ACTIONS: QuickAction[] = [
  { id: "journal", label: "ثبت ترید", icon: <Plus className="h-4 w-4" />, accent: "text-emerald-500 bg-emerald-500/10" },
  { id: "mentor", label: "تحلیل منتور", icon: <Bot className="h-4 w-4" />, accent: "text-gold bg-gold/10" },
  { id: "calendar", label: "تقویم", icon: <CalendarDays className="h-4 w-4" />, accent: "text-sky-500 bg-sky-500/10" },
  { id: "dailyJournal", label: "یادداشت روز", icon: <BookHeart className="h-4 w-4" />, accent: "text-violet-500 bg-violet-500/10" },
  { id: "analytics", label: "آنالیز", icon: <Grid3x3 className="h-4 w-4" />, accent: "text-amber-500 bg-amber-500/10" },
  { id: "report", label: "گزارش", icon: <FileText className="h-4 w-4" />, accent: "text-rose-500 bg-rose-500/10" },
];

export function QuickActions() {
  const setSection = useAppStore((s) => s.setSection);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-bold">دسترسی سریع</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => setSection(action.id)}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/60 p-3 transition-all hover:border-gold/40 hover:bg-muted/40 card-lift"
          >
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
              action.accent
            )}>
              {action.icon}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
