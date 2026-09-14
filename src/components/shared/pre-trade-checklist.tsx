"use client";

import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Circle, ShieldCheck, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

// LIT methodology pre-trade checklist — enforces discipline before entry.
// Each item maps to a step in the Liquidity Inducement Theorem workflow.
const CHECKLIST: ChecklistItem[] = [
  { id: "htf", label: "بایاس تایم‌فریم بالاتر مشخص شد", hint: "H1/H4/D1 رو بررسی کردی؟ روند چیه؟" },
  { id: "liquidity", label: "لیکوییدیتی مشخص شد", hint: "اکوال های/لوز یا خط روند لیکویید" },
  { id: "inducement", label: "نوع القا شناسایی شد", hint: "کوچک (شارژ) یا بزرگ (تغییر روند)؟" },
  { id: "confirmation", label: "تایید ورود دیده شد", hint: "BOS / CHoCH / Mitigation" },
  { id: "opposite", label: "دیدگاه مخالف سنجیده شد", hint: "چرا این ترید می‌تونه غلط باشه؟" },
  { id: "risk", label: "ریسک متناسب با پلن", hint: "حداکثر ریسک مجاز رعایت شد" },
  { id: "thesis", label: "تز ثبت شد", hint: "قبل از ورود نوشته شد" },
];

const STORAGE_KEY = "trading-os-checklist";

export function PreTradeChecklist() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const setSection = useAppStore((s) => s.setSection);

  const toggle = (id: string) => {
    setItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const reset = () => {
    setItems({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast.success("چک‌لیست ریست شد");
  };

  const completedCount = CHECKLIST.filter((item) => items[item.id]).length;
  const allComplete = completedCount === CHECKLIST.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-xl border p-3 text-right transition-all hover:border-gold/40 card-lift w-full",
          allComplete
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-border/60 bg-card"
        )}
      >
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          allComplete ? "bg-emerald-500/15 text-emerald-500" : "bg-gold/10 text-gold"
        )}>
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">چک‌لیست پیش از ورود</p>
          <p className="text-[11px] text-muted-foreground">
            {allComplete ? "آماده‌ی ورود ✓" : `${completedCount} از ${CHECKLIST.length} مورد تایید شده`}
          </p>
        </div>
        <div className="flex gap-0.5">
          {CHECKLIST.map((item) => (
            <div
              key={item.id}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                items[item.id] ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center justify-between text-right">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" />
                چک‌لیست پیش از ورود
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                allComplete ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
              )}>
                <Num>{completedCount}</Num>/<Num>{CHECKLIST.length}</Num>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto scroll-thin px-5 py-4">
            <p className="mb-4 text-xs text-muted-foreground">
              قبل از زدن دکمه‌ی ورود، هر مورد رو تایید کن. این انضباط LIT رو حفظ می‌کنه.
            </p>
            <div className="space-y-2">
              {CHECKLIST.map((item) => {
                const done = items[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border-2 p-3 text-right transition-all",
                      done
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border hover:border-gold/30 hover:bg-muted/40"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        done && "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {item.label}
                      </p>
                      {item.hint && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {allComplete && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-500">آماده‌ی ورود!</p>
                <p className="text-xs text-muted-foreground">همه موارد تایید شد. با اطمینان وارد شو.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between border-t px-5 py-3">
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              ریست
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>بستن</Button>
              {allComplete && (
                <Button
                  onClick={() => {
                    setSection("journal");
                    setOpen(false);
                    reset();
                  }}
                  className="gap-1.5"
                >
                  ثبت ترید
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Inline Num to avoid import cycle
function Num({ children }: { children: React.ReactNode }) {
  return <span dir="ltr" className="num inline-block tabular-nums">{children}</span>;
}
