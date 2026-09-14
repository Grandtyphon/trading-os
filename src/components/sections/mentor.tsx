"use client";

import { useState, useMemo, useRef } from "react";
import {
  useTrades,
  useProfiles,
  useMentorHistory,
  saveMentorHistory,
  deleteMentorHistory,
  clearMentorHistory,
} from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { buildMentorPayload, computeStats } from "@/lib/stats";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num, DateText, EmptyState, SectionHeader, StatCard } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot, Sparkles, WifiOff, AlertTriangle, Loader2, Send,
  TrendingUp, Trophy, Target, Zap, Lightbulb, CheckCircle2,
  History, Trash2, ChevronLeft, X,
} from "lucide-react";
import { toast } from "sonner";
import type { MentorAnalysis, MentorHistory } from "@/lib/types";
import { uid } from "@/lib/dexie";

const SEV_STYLE = {
  high: { ring: "border-rose-500/40", bg: "bg-rose-500/5", dot: "bg-rose-500", text: "text-rose-500", label: "بحرانی" },
  medium: { ring: "border-amber-500/40", bg: "bg-amber-500/5", dot: "bg-amber-500", text: "text-amber-500", label: "هشدار" },
  low: { ring: "border-sky-500/40", bg: "bg-sky-500/5", dot: "bg-sky-500", text: "text-sky-500", label: "نکته" },
} as const;

const PRI_STYLE = {
  high: "border-rose-500/40 bg-rose-500/5 text-rose-500",
  medium: "border-amber-500/40 bg-amber-500/5 text-amber-500",
  low: "border-sky-500/40 bg-sky-500/5 text-sky-500",
} as const;

// Extract first JSON object from a possibly-noisy text stream
function extractJson(text: string): MentorAnalysis | null {
  if (!text) return null;
  // strip markdown code fences
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    // try fixing trailing commas
    try {
      return JSON.parse(slice.replace(/,(\s*[}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

export function MentorSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const profiles = useProfiles();
  const trades = useTrades(profileId);
  const history = useMentorHistory(profileId);
  const isOnline = useAppStore((s) => s.isOnline);
  const mentorRange = useAppStore((s) => s.mentorRange);
  const setMentorRange = useAppStore((s) => s.setMentorRange);
  const activeProfile = profiles?.find((p) => p.id === profileId);

  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState("");
  const [analysis, setAnalysis] = useState<MentorAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<MentorHistory | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stats = useMemo(() => (trades ? computeStats(trades) : null), [trades]);

  const relevantTrades = useMemo(() => {
    if (!trades) return [];
    const closed = trades.filter((t) => t.outcome !== "open");
    const sorted = [...closed].sort((a, b) => (b.openedAt ?? b.createdAt) - (a.openedAt ?? a.createdAt));
    if (mentorRange === "last10") return sorted.slice(0, 10).reverse();
    if (mentorRange === "last30") return sorted.slice(0, 30).reverse();
    return sorted.reverse();
  }, [trades, mentorRange]);

  const rangeLabel =
    mentorRange === "last10" ? T.mentor.last10 : mentorRange === "last30" ? T.mentor.last30 : T.mentor.lastAll;

  const handleAnalyze = async () => {
    if (!isOnline) {
      setError(T.mentor.errorOffline);
      return;
    }
    if (relevantTrades.length === 0) {
      setError(T.mentor.noData);
      return;
    }
    setStreaming(true);
    setPartial("");
    setAnalysis(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = buildMentorPayload(relevantTrades as any, rangeLabel);
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, question: question.trim() || undefined }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg: string = T.mentor.errorGeneric;
        try {
          const j = await res.json();
          msg = (j?.error as string) ?? msg;
        } catch {}
        if (res.status === 429) msg = "محدودیت درخواست — کمی صبر کن و دوباره تلاش کن";
        if (res.status >= 500) msg = "زمان پاسخ طول کشید. دوباره تلاش کن.";
        throw new Error(msg);
      }

      // Analysis mode now returns JSON directly (no streaming text to parse)
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // New flow: Gemini structured output — direct JSON
        const analysis = await res.json();
        setAnalysis(analysis);
        setPartial("");

        // Save to history
        try {
          const record: MentorHistory = {
            id: uid(),
            profileId: profileId === "all" ? "all" : profileId,
            range: rangeLabel,
            question: question.trim() || null,
            analysis,
            rawText: JSON.stringify(analysis),
            tradeCount: relevantTrades.length,
            createdAt: Date.now(),
          };
          await saveMentorHistory(record);
        } catch {
          // history save failure is non-fatal
        }
      } else {
        // Legacy fallback: streaming text (for backward compat)
        const reader = res.body?.getReader();
        if (!reader) throw new Error(T.mentor.errorGeneric);

        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          acc += chunk;
          setPartial(acc);
        }

        const parsed = extractJson(acc);
        const finalAnalysis: MentorAnalysis = parsed ?? {
          summary: acc.trim() || "پاسخی دریافت نشد",
          patterns: [],
          strengths: [],
          recommendations: [],
          confidence_note: "خروجی به‌صورت JSON ساختاریافته نبود. متن خام بالا نمایش داده شد.",
        };
        setAnalysis(finalAnalysis);

        try {
          const record: MentorHistory = {
            id: uid(),
            profileId: profileId === "all" ? "all" : profileId,
            range: rangeLabel,
            question: question.trim() || null,
            analysis: finalAnalysis,
            rawText: acc,
            tradeCount: relevantTrades.length,
            createdAt: Date.now(),
          };
          await saveMentorHistory(record);
        } catch {}
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        // user cancelled
      } else {
        setError(e?.message ?? T.mentor.errorGeneric);
        toast.error(e?.message ?? T.mentor.errorGeneric);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.mentor.title}
        subtitle={T.mentor.subtitle}
        icon={<Bot className="h-5 w-5" />}
        action={
          history && history.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="gap-1.5">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">تاریخچه</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                <Num>{history.length}</Num>
              </Badge>
            </Button>
          ) : undefined
        }
      />

      {/* Online warning */}
      {!isOnline && (
        <Card className="flex items-center gap-3 border-amber-500/40 bg-amber-500/5 p-3">
          <WifiOff className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-500">{T.mentor.requiresInternet}</p>
        </Card>
      )}

      {/* Stat summary */}
      {stats && stats.total > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={T.dashboard.winRate} value={`${stats.winRate}%`} accent={stats.winRate >= 50 ? "gain" : "loss"} icon={<Trophy className="h-4 w-4" />} />
            <StatCard label={T.dashboard.netR} value={formatR(stats.netR)} accent={stats.netR >= 0 ? "gain" : "loss"} icon={<Zap className="h-4 w-4" />} />
            <StatCard label={T.dashboard.expectancy} value={formatR(stats.expectancy)} accent={stats.expectancy >= 0 ? "gain" : "loss"} icon={<Target className="h-4 w-4" />} />
            <StatCard label="ترید‌های تحلیل" value={`${relevantTrades.length}`} sub={rangeLabel} icon={<TrendingUp className="h-4 w-4" />} />
          </div>

          {/* Range selector + question */}
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{T.mentor.selectRange}:</span>
              {([
                { v: "last10", l: T.mentor.last10 },
                { v: "last30", l: T.mentor.last30 },
                { v: "all", l: T.mentor.lastAll },
              ] as const).map((r) => (
                <button
                  key={r.v}
                  onClick={() => setMentorRange(r.v)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    mentorRange === r.v
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {r.l}
                </button>
              ))}
            </div>
            <Textarea
              dir="rtl"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="سوال اختیاری برای منتور (مثلاً: چرا تو سشن آسیا ضعیفم؟)"
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {activeProfile ? `پروفایل: ${activeProfile.name}` : T.common.all} · {rangeLabel}
              </p>
              {streaming ? (
                <Button variant="outline" onClick={handleStop} className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  توقف
                </Button>
              ) : (
                <Button onClick={handleAnalyze} disabled={!isOnline || relevantTrades.length === 0} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {T.mentor.analyze}
                </Button>
              )}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<Bot className="h-7 w-7" />}
          title={T.mentor.noData}
          hint="اول چند ترید ثبت کن تا منتور بتونه تحلیل کنه"
        />
      )}

      {/* Error */}
      {error && (
        <Card className="flex items-start gap-3 border-rose-500/40 bg-rose-500/5 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-rose-500">خطا</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </Card>
      )}

      {/* Streaming partial */}
      {streaming && (
        <Card className="border-gold/30 bg-gold/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gold">
            <Loader2 className="h-4 w-4 animate-spin" />
            {T.mentor.analyzing}
          </div>
          <pre className="max-h-48 overflow-y-auto scroll-thin whitespace-pre-wrap break-words text-xs text-muted-foreground" dir="rtl">
            {partial || "در حال آماده‌سازی تحلیل…"}
          </pre>
        </Card>
      )}

      {/* Analysis result */}
      {analysis && !streaming && (
        <div className="space-y-4 animate-fade-up">
          {/* Summary */}
          <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold">{T.mentor.summary}</h3>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{analysis.summary}</p>
          </Card>

          {/* Patterns */}
          {analysis.patterns?.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {T.mentor.patterns}
              </h3>
              <div className="space-y-2">
                {analysis.patterns.map((p, i) => {
                  const s = SEV_STYLE[p.severity] ?? SEV_STYLE.medium;
                  return (
                    <Card key={i} className={cn("border p-3", s.ring, s.bg)}>
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", s.dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold">{p.title}</span>
                            <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px]", s.ring, s.text)}>{s.label}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                          {p.evidence && (
                            <p className="mt-1.5 rounded bg-background/50 p-1.5 text-xs text-muted-foreground">
                              <span className="font-medium">شواهد: </span>{p.evidence}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {T.mentor.strengths}
              </h3>
              <Card className="space-y-2 border-emerald-500/30 bg-emerald-500/5 p-3">
                {analysis.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{s}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Lightbulb className="h-4 w-4 text-gold" />
                {T.mentor.recommendations}
              </h3>
              <div className="space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <Card key={i} className={cn("border p-3", PRI_STYLE[r.priority] ?? PRI_STYLE.medium)}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold">
                        <Num>{i + 1}</Num>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.action}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.reasoning}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {r.priority === "high" ? "اولویت بالا" : r.priority === "medium" ? "متوسط" : "کم"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Confidence note */}
          {analysis.confidence_note && (
            <Card className="flex items-start gap-2 border-border/60 bg-muted/20 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{T.mentor.confidence}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{analysis.confidence_note}</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* History list dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center justify-between text-right">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                تاریخچه‌ی تحلیل‌ها
              </span>
              {history && history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-rose-500 hover:bg-rose-500/10"
                  onClick={async () => {
                    await clearMentorHistory(profileId === "all" ? "all" : profileId);
                    toast.success("تاریخچه پاک شد");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  پاک کردن
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto scroll-thin p-3">
            {history?.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setViewingHistory(h);
                  setHistoryOpen(false);
                }}
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-right transition-colors hover:bg-muted/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <DateText ts={h.createdAt} withTime className="text-xs font-medium" />
                    <Badge variant="outline" className="text-[9px]">{h.range}</Badge>
                  </div>
                  {h.question && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">سوال: {h.question}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.analysis.summary}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span><Num>{h.tradeCount}</Num> ترید</span>
                    {h.analysis.patterns.length > 0 && (
                      <span>· <Num>{h.analysis.patterns.length}</Num> الگو</span>
                    )}
                    {h.analysis.recommendations.length > 0 && (
                      <span>· <Num>{h.analysis.recommendations.length}</Num> توصیه</span>
                    )}
                  </div>
                </div>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {history && history.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">هنوز تحلیلی ثبت نشده</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View history detail */}
      {viewingHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setViewingHistory(null)}>
          <Card
            className="w-full max-w-lg max-h-[88vh] overflow-hidden rounded-t-2xl sm:rounded-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Bot className="h-4 w-4 text-gold" />
                  تحلیل قدیمی
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <DateText ts={viewingHistory.createdAt} withTime />
                  {" · "}<Num>{viewingHistory.tradeCount}</Num> ترید · {viewingHistory.range}
                </p>
                {viewingHistory.question && (
                  <p className="mt-1 text-xs text-muted-foreground">سوال: {viewingHistory.question}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingHistory(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto scroll-thin p-4">
              <Card className="border-gold/30 bg-gold/5 p-3">
                <p className="mb-1 text-[11px] font-medium text-gold">{T.mentor.summary}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{viewingHistory.analysis.summary}</p>
              </Card>
              {viewingHistory.analysis.patterns?.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold">{T.mentor.patterns}</p>
                  <div className="space-y-2">
                    {viewingHistory.analysis.patterns.map((p, i) => {
                      const s = SEV_STYLE[p.severity] ?? SEV_STYLE.medium;
                      return (
                        <Card key={i} className={cn("border p-3", s.ring, s.bg)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold">{p.title}</span>
                            <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px]", s.ring, s.text)}>{s.label}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                          {p.evidence && <p className="mt-1 text-xs text-muted-foreground">شواهد: {p.evidence}</p>}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              {viewingHistory.analysis.strengths?.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold">{T.mentor.strengths}</p>
                  <Card className="space-y-2 border-emerald-500/30 bg-emerald-500/5 p-3">
                    {viewingHistory.analysis.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </Card>
                </div>
              )}
              {viewingHistory.analysis.recommendations?.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold">{T.mentor.recommendations}</p>
                  <div className="space-y-2">
                    {viewingHistory.analysis.recommendations.map((r, i) => (
                      <Card key={i} className={cn("border p-3", PRI_STYLE[r.priority] ?? PRI_STYLE.medium)}>
                        <p className="text-sm font-medium">{r.action}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.reasoning}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {viewingHistory.analysis.confidence_note && (
                <Card className="flex items-start gap-2 border-border/60 bg-muted/20 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{T.mentor.confidence}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{viewingHistory.analysis.confidence_note}</p>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
