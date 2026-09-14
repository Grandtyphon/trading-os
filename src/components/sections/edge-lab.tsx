"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeEdge } from "@/lib/stats";
import { T } from "@/lib/i18n";
import { formatR, pnlColor } from "@/lib/format";
import { SETUP_OPTIONS } from "@/lib/constants";
import { Num, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, AlertTriangle } from "lucide-react";

const SETUP_LABEL: Record<string, string> = Object.fromEntries(SETUP_OPTIONS.map((s) => [s.value, s.label]));

export function EdgeLabSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);
  const edges = useMemo(() => (trades ? computeEdge(trades) : []), [trades]);

  const maxEdge = edges.length ? Math.max(...edges.map((e) => Math.abs(e.edge)), 0.01) : 1;
  const enoughData = edges.reduce((s, e) => s + e.count, 0) >= 10;

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.edgeLab.title}
        subtitle={T.edgeLab.subtitle}
        icon={<TrendingUp className="h-5 w-5" />}
      />

      {!trades || trades.length === 0 ? (
        <EmptyState icon={<TrendingUp className="h-7 w-7" />} title={T.common.empty} hint={T.common.emptyHint} />
      ) : !enoughData ? (
        <EmptyState icon={<TrendingUp className="h-7 w-7" />} title={T.edgeLab.noData} hint="حداقل ۱۰ ترید بسته‌شده ثبت کن" />
      ) : (
        <div className="space-y-3">
          {/* Best edge highlight */}
          {edges[0] && edges[0].edge > 0 && (
            <Card className="flex items-center gap-4 border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <Award className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">بهترین لبه</p>
                <p className="text-lg font-bold">{SETUP_LABEL[edges[0].setup] ?? edges[0].setup}</p>
                <p className="text-xs text-muted-foreground">
                  <Num>{edges[0].count}</Num> ترید · نرخ برد <Num>{edges[0].winRate}%</Num> · میانگین <Num>{formatR(edges[0].avgR)}</Num>
                </p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-emerald-500"><Num>{edges[0].edge.toFixed(1)}</Num></p>
                <p className="text-[10px] text-muted-foreground">امتیاز لبه</p>
              </div>
            </Card>
          )}

          {/* Edge bars */}
          <div className="space-y-2">
            {edges.map((e) => {
              const isPositive = e.edge >= 0;
              const widthPct = (Math.abs(e.edge) / maxEdge) * 100;
              return (
                <Card key={e.setup} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{SETUP_LABEL[e.setup] ?? e.setup}</span>
                        <Badge variant="outline" className="text-[10px]"><Num>{e.count}</Num> ترید</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        نرخ برد <Num>{e.winRate}%</Num> · میانگین <Num>{formatR(e.avgR)}</Num>
                      </p>
                    </div>
                    <span className={`text-base font-bold ${pnlColor(e.netR)}`}>
                      <Num>{formatR(e.netR)}</Num>
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="border-gold/20 bg-gold/5 p-3">
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {T.edgeLab.edgeHint} — لبه بالا با تعداد کم ممکنه تصادفی باشه. بالاترین اعتبار برای ست‌آپ‌های با حداقل ۲۰ تریده.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
