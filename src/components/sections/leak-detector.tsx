"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { detectLeaks, getMistakeLabel } from "@/lib/stats";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Num, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck, Lightbulb } from "lucide-react";

const SEV_STYLE = {
  high: { border: "border-rose-500/40", bg: "bg-rose-500/5", text: "text-rose-500", label: "بحرانی" },
  medium: { border: "border-amber-500/40", bg: "bg-amber-500/5", text: "text-amber-500", label: "هشدار" },
  low: { border: "border-sky-500/40", bg: "bg-sky-500/5", text: "text-sky-500", label: "نکته" },
} as const;

export function LeakDetectorSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);
  const leaks = useMemo(() => (trades ? detectLeaks(trades) : []), [trades]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.leakDetector.title}
        subtitle={T.leakDetector.subtitle}
        icon={<ShieldAlert className="h-5 w-5" />}
      />

      {!trades || trades.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="h-7 w-7" />} title={T.common.empty} hint={T.common.emptyHint} />
      ) : leaks.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-emerald-500/30 bg-emerald-500/5 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-emerald-500">{T.leakDetector.noLeaks}</p>
          <p className="max-w-sm text-sm text-muted-foreground">الگوی مخرب مشخصی تو دیتات پیدا نشد. به روتینت پایبند باش و ادامه بده.</p>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm">
            <span className="font-semibold text-rose-500">{T.leakDetector.leaksFound}: </span>
            <span className="text-muted-foreground"><Num>{leaks.length}</Num> نشتی شناسایی شد</span>
          </div>
          <div className="space-y-3">
            {leaks.map((l) => {
              const s = SEV_STYLE[l.severity];
              return (
                <Card key={l.id} className={cn("border p-4", s.border, s.bg)}>
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", s.bg, s.text)}>
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">{l.title}</h3>
                        <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium", s.border, s.text)}>
                          {s.label}
                        </span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Num>{l.metric}</Num>
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{l.description}</p>
                      <div className={cn("mt-2.5 flex items-start gap-2 rounded-lg bg-background/60 p-2.5 text-sm")}>
                        <Lightbulb className={cn("mt-0.5 h-4 w-4 shrink-0", s.text)} />
                        <span>{l.suggestion}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
