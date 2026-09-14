"use client";

import { useState, useMemo } from "react";
import { useTrades, deleteTrade } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatR, formatPrice, pnlColor } from "@/lib/format";
import { SETUP_OPTIONS, TRADING_SESSIONS, MISTAKE_TAGS } from "@/lib/constants";
import { TradeForm } from "@/components/trade-form";
import { Num, DateText, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ImageIcon,
  ChevronLeft,
  Copy,
  CalendarRange,
  X,
  CheckSquare,
  Check,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import type { Trade } from "@/lib/types";
import { DateRangeFilter, useDateRangeWindow, filterByDateRange } from "@/components/shared/date-range-filter";
import { QuickStats } from "@/components/shared/quick-stats";
import { Markdown } from "@/components/shared/markdown";
import { RiskReward } from "@/components/shared/risk-reward";
import { saveTrade } from "@/hooks/use-data";
import { uid } from "@/lib/dexie";
import { db } from "@/lib/dexie";

const SETUP_LABEL: Record<string, string> = Object.fromEntries(
  SETUP_OPTIONS.map((s) => [s.value, s.label])
);
const SESSION_LABEL: Record<string, string> = Object.fromEntries(
  TRADING_SESSIONS.map((s) => [s.value, s.label])
);
const MISTAKE_LABEL: Record<string, string> = Object.fromEntries(
  MISTAKE_TAGS.map((m) => [m.value, m.label])
);

export function JournalSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [setupFilter, setSetupFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [mistakeFilter, setMistakeFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "r-desc" | "r-asc" | "symbol">("date-desc");
  const { start, end } = useDateRangeWindow();

  // Collect all unique mistake tags used in current trades for the filter dropdown
  const availableMistakes = useMemo(() => {
    if (!trades) return [];
    const set = new Set<string>();
    trades.forEach((t) => t.mistakeTags?.forEach((m) => set.add(m)));
    return Array.from(set);
  }, [trades]);

  const filtered = useMemo(() => {
    if (!trades) return [];
    const dateFiltered = filterByDateRange(trades, start, end);
    const result = dateFiltered.filter((t) => {
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()) && !t.thesis.includes(search)) return false;
      if (setupFilter !== "all" && t.setup !== setupFilter) return false;
      if (outcomeFilter !== "all" && t.outcome !== outcomeFilter) return false;
      if (mistakeFilter !== "all" && !(t.mistakeTags ?? []).includes(mistakeFilter)) return false;
      return true;
    });
    // sort
    const sorted = [...result];
    switch (sortBy) {
      case "date-desc": sorted.sort((a, b) => b.openedAt - a.openedAt); break;
      case "date-asc": sorted.sort((a, b) => a.openedAt - b.openedAt); break;
      case "r-desc": sorted.sort((a, b) => (b.resultR ?? -999) - (a.resultR ?? -999)); break;
      case "r-asc": sorted.sort((a, b) => (a.resultR ?? 999) - (b.resultR ?? 999)); break;
      case "symbol": sorted.sort((a, b) => a.symbol.localeCompare(b.symbol)); break;
    }
    return sorted;
  }, [trades, search, setupFilter, outcomeFilter, mistakeFilter, start, end, sortBy]);

  const hasActiveFilters = setupFilter !== "all" || outcomeFilter !== "all" || mistakeFilter !== "all" || search;

  const clearFilters = () => {
    setSearch("");
    setSetupFilter("all");
    setOutcomeFilter("all");
    setMistakeFilter("all");
  };

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (t: Trade) => {
    setEditing(t);
    setFormOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTrade(deleteId);
    toast.success("ترید حذف شد");
    setDeleteId(null);
  };

  const handleDuplicate = async (trade: Trade) => {
    const now = Date.now();
    const clone: Trade = {
      ...trade,
      id: uid(),
      openedAt: now,
      closedAt: now,
      outcome: "open",
      resultR: null,
      pnlPercent: null,
      exit: null,
      postNote: "",
      lessons: "",
      createdAt: now,
      updatedAt: now,
    };
    await saveTrade(clone);
    toast.success("ترید کپی شد — آماده‌ی ویرایش");
    setEditing(clone);
    setFormOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await deleteTrade(id);
    }
    toast.success(`${count} ترید حذف شد`);
    exitSelectMode();
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.journal.title}
        subtitle={T.journal.subtitle}
        icon={<BookOpen className="h-5 w-5" />}
        action={
          selectMode ? (
            <Button variant="ghost" size="sm" onClick={exitSelectMode} className="gap-1.5 text-xs">
              <X className="h-4 w-4" />
              خروج از انتخاب
            </Button>
          ) : (
            <div className="flex gap-2">
              {trades && trades.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5">
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">انتخاب</span>
                </Button>
              )}
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{T.journal.addTrade}</span>
              </Button>
            </div>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            dir="rtl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T.common.search}
            className="pr-9"
          />
        </div>
        <Select value={setupFilter} onValueChange={setSetupFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={T.journal.setup} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{T.common.all}</SelectItem>
            {SETUP_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{T.common.all}</SelectItem>
            <SelectItem value="win">{T.journal.win}</SelectItem>
            <SelectItem value="loss">{T.journal.loss}</SelectItem>
            <SelectItem value="breakeven">{T.journal.breakeven}</SelectItem>
            <SelectItem value="open">{T.journal.open}</SelectItem>
          </SelectContent>
        </Select>
        {availableMistakes.length > 0 && (
          <Select value={mistakeFilter} onValueChange={setMistakeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="اشتباه" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T.common.all}</SelectItem>
              {availableMistakes.map((m) => (
                <SelectItem key={m} value={m}>{MISTAKE_LABEL[m] ?? m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DateRangeFilter />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">جدیدترین اول</SelectItem>
            <SelectItem value="date-asc">قدیمی‌ترین اول</SelectItem>
            <SelectItem value="r-desc">بیشترین R</SelectItem>
            <SelectItem value="r-asc">کمترین R</SelectItem>
            <SelectItem value="symbol">نماد (الفبا)</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            پاک کردن فیلترها
          </Button>
        )}
      </div>

      {/* Active filter count summary */}
      {hasActiveFilters && filtered && filtered.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <Num>{filtered.length}</Num> از <Num>{trades?.length ?? 0}</Num> ترید
          </Badge>
        </div>
      )}

      {/* Quick stats strip */}
      {trades && trades.length > 0 && <QuickStats />}

      {/* Bulk action bar (select mode) */}
      {selectMode && filtered && filtered.length > 0 && (
        <div className="sticky top-16 z-30 flex items-center gap-2 rounded-xl border border-gold/30 bg-card/95 p-2.5 backdrop-blur-xl shadow-lg">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedIds.size === filtered.length ? "لغو همه" : "انتخاب همه"}
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs font-medium">
            <Num>{selectedIds.size}</Num> انتخاب شده
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Edit3 className="h-3.5 w-3.5" />
            ویرایش گروهی
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => {
              if (confirm(`${selectedIds.size} ترید حذف بشن؟`)) handleBulkDelete();
            }}
            className="gap-1.5 text-xs text-rose-500 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </Button>
        </div>
      )}

      {/* List */}
      {!filtered || filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title={trades && trades.length > 0 ? "موردی با این فیلترها پیدا نشد" : T.common.empty}
          hint={T.common.emptyHint}
          action={
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {T.journal.addTrade}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <TradeRow
              key={t.id}
              trade={t}
              expanded={expanded === t.id}
              onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
              onEdit={() => handleEdit(t)}
              onDelete={() => setDeleteId(t.id)}
              onDuplicate={() => handleDuplicate(t)}
              selectMode={selectMode}
              selected={selectedIds.has(t.id)}
              onSelectToggle={() => toggleSelect(t.id)}
            />
          ))}
        </div>
      )}

      <TradeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        profileId={profileId === "all" ? "all" : profileId}
        trade={editing}
      />

      <BulkEditDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedIds={selectedIds}
        onComplete={exitSelectMode}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.common.delete}</AlertDialogTitle>
            <AlertDialogDescription>این ترید حذف بشه؟ قابل بازگشت نیست.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600">
              {T.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TradeRow({
  trade: t,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  selectMode,
  selected,
  onSelectToggle,
}: {
  trade: Trade;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  selectMode: boolean;
  selected: boolean;
  onSelectToggle: () => void;
}) {
  const r = t.resultR;
  const isLong = t.direction === "long";
  const outcomeBadge = {
    win: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    loss: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    breakeven: "bg-muted text-muted-foreground",
    open: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  }[t.outcome];

  return (
    <Card className={cn("overflow-hidden p-0 transition-all hover:border-gold/25", selected && "ring-2 ring-gold/50 border-gold/40")}>
      <button
        onClick={selectMode ? onSelectToggle : onToggle}
        className="flex w-full items-center gap-3 p-3 text-right transition-colors hover:bg-muted/40"
      >
        {selectMode && (
          <div className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            selected ? "border-gold bg-gold text-black" : "border-muted-foreground/40"
          )}>
            {selected && <Check className="h-3 w-3" />}
          </div>
        )}
        {/* direction icon */}
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {isLong ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold"><Num>{t.symbol}</Num></span>
            <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium", outcomeBadge)}>
              {t.outcome === "win" ? T.journal.win : t.outcome === "loss" ? T.journal.loss : t.outcome === "breakeven" ? T.journal.breakeven : T.journal.open}
            </span>
            {t.chartImage && <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{SETUP_LABEL[t.setup] ?? t.setup}</span>
            <span>·</span>
            <span>{SESSION_LABEL[t.session] ?? t.session}</span>
            <span>·</span>
            <DateText ts={t.openedAt} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className={cn("text-base font-bold tabular-nums", pnlColor(r))}>
            <Num>{formatR(r)}</Num>
          </span>
          <span className="text-[11px] text-muted-foreground">
            ریسک <Num>{t.riskPercent}%</Num>
          </span>
        </div>
        <ChevronLeft className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "-rotate-90")} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t bg-muted/20 p-3">
          {/* levels */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Level label={T.journal.entry} value={t.entry} />
            <Level label={T.journal.stop} value={t.stop} />
            <Level label={T.journal.target} value={t.target} />
            <Level label={T.journal.exit} value={t.exit} />
          </div>

          {/* Risk/Reward compact */}
          {t.entry > 0 && t.stop > 0 && t.target !== null && (
            <RiskReward
              entry={t.entry}
              stop={t.stop}
              target={t.target}
              direction={t.direction}
              compact
            />
          )}

          {/* LIT checklist */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px]">{SETUP_LABEL[t.setup]}</Badge>
            <Badge variant="outline" className="text-[10px]">TF: <Num>{t.timeframe}</Num></Badge>
            <Badge variant="outline" className="text-[10px]">بایاس: {t.htfBias}</Badge>
            <Badge variant="outline" className="text-[10px]">تایید: {t.ltfConfirmation}</Badge>
            <Badge variant="outline" className="text-[10px]">القا: {t.inducement}</Badge>
            {t.biasConflictConsidered && <Badge className="bg-emerald-500/15 text-emerald-500 text-[10px]">دیدگاه مخالف سنجیده شد</Badge>}
          </div>

          {/* thesis */}
          {t.thesis && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-gold">{T.journal.thesis}</p>
              <div className="rounded-lg bg-background/50 p-2">
                <Markdown>{t.thesis}</Markdown>
              </div>
            </div>
          )}
          {!t.thesis && (
            <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-500">{T.journal.noThesisWarn}</p>
          )}

          {/* post note */}
          {t.postNote && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">{T.journal.postNote}</p>
              <div className="rounded-lg bg-background/50 p-2">
                <Markdown>{t.postNote}</Markdown>
              </div>
            </div>
          )}

          {/* mistakes */}
          {t.mistakeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.mistakeTags.map((m) => (
                <Badge key={m} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-500 text-[10px]">
                  {MISTAKE_LABEL[m] ?? m}
                </Badge>
              ))}
            </div>
          )}

          {/* chart */}
          {t.chartImage && (
            <img src={t.chartImage} alt="chart" className="w-full rounded-lg border bg-black/30" />
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onDuplicate} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              کپی
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              {T.common.edit}
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-rose-500 hover:bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5" />
              {T.common.delete}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Level({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-background/50 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-medium"><Num>{formatPrice(value)}</Num></div>
    </div>
  );
}

// ---------- Bulk Edit Dialog ----------
// Apply changes (setup, session, tags, mistakes, risk) to multiple trades at once.
// Each field is optional — only fields the user explicitly changes get updated.
interface BulkPatch {
  setup?: string;
  session?: Trade["session"];
  timeframe?: string;
  riskPercent?: number;
  addTags?: string[];
  removeTags?: string[];
  addMistakes?: string[];
}

function BulkEditDialog({
  open,
  onOpenChange,
  selectedIds,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: Set<string>;
  onComplete: () => void;
}) {
  const count = selectedIds.size;
  const [patch, setPatch] = useState<BulkPatch>({});
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const hasChanges = Object.keys(patch).length > 0;

  const toggleMistake = (m: string) => {
    setPatch((p) => {
      const add = p.addMistakes ?? [];
      if (add.includes(m)) return { ...p, addMistakes: add.filter((x) => x !== m) };
      return { ...p, addMistakes: [...add, m] };
    });
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    setPatch((p) => ({ ...p, addTags: [...(p.addTags ?? []), v] }));
    setTagInput("");
  };

  const handleApply = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const trade = await db.trades.get(id);
        if (!trade) continue;
        const updated: Trade = { ...trade, updatedAt: Date.now() };
        if (patch.setup) updated.setup = patch.setup;
        if (patch.session) updated.session = patch.session;
        if (patch.timeframe) updated.timeframe = patch.timeframe;
        if (patch.riskPercent !== undefined) updated.riskPercent = patch.riskPercent;
        if (patch.addTags && patch.addTags.length > 0) {
          updated.tags = [...new Set([...(trade.tags ?? []), ...patch.addTags])];
        }
        if (patch.addMistakes && patch.addMistakes.length > 0) {
          updated.mistakeTags = [...new Set([...(trade.mistakeTags ?? []), ...patch.addMistakes])];
        }
        await db.trades.put(updated);
      }
      toast.success(`${count} ترید به‌روز شد`);
      setPatch({});
      onOpenChange(false);
      onComplete();
    } catch {
      toast.error("خطا در ویرایش گروهی");
    } finally {
      setSaving(false);
    }
  };

  const fieldCount = Object.keys(patch).filter((k) => k !== "addTags" || (patch.addTags && patch.addTags.length > 0)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Edit3 className="h-4 w-4 text-gold" />
            ویرایش گروهی
            <Badge variant="secondary" className="mr-auto"><Num>{count}</Num> ترید</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] scroll-thin">
          <div className="space-y-4 px-5 py-5">
            <p className="text-xs text-muted-foreground">
              فقط فیلدهایی که تغییر می‌دی به همه‌ی تریدهای انتخاب‌شده اعمال می‌شن. بقیه دست‌نخورده می‌مونن.
            </p>

            {/* Setup */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">ست‌آپ (برای تغییر انتخاب کن)</Label>
              <Select
                value={patch.setup ?? "__none"}
                onValueChange={(v) => setPatch((p) => ({ ...p, setup: v === "__none" ? undefined : v }))}
              >
                <SelectTrigger><SelectValue placeholder="بدون تغییر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">بدون تغییر</SelectItem>
                  {SETUP_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">سشن</Label>
              <Select
                value={patch.session ?? "__none"}
                onValueChange={(v) => setPatch((p) => ({ ...p, session: v === "__none" ? undefined : (v as Trade["session"]) }))}
              >
                <SelectTrigger><SelectValue placeholder="بدون تغییر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">بدون تغییر</SelectItem>
                  {TRADING_SESSIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Risk */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">ریسک (٪) — برای تغییر عدد وارد کن</Label>
              <Input
                type="number"
                inputMode="decimal"
                dir="ltr"
                className="text-left"
                placeholder="بدون تغییر"
                value={patch.riskPercent ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPatch((p) => ({ ...p, riskPercent: v ? parseFloat(v) : undefined }));
                }}
              />
            </div>

            {/* Add mistakes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">افزودن اشتباه به همه</Label>
              <div className="flex flex-wrap gap-1.5">
                {MISTAKE_TAGS.map((m) => {
                  const active = (patch.addMistakes ?? []).includes(m.value);
                  return (
                    <button
                      key={m.value}
                      onClick={() => toggleMistake(m.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-500"
                          : "border-border text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">افزودن برچسب به همه</Label>
              <div className="flex gap-2">
                <Input
                  dir="rtl"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="برچسب + اینتر"
                />
                <Button variant="secondary" size="sm" onClick={addTag}>+</Button>
              </div>
              {patch.addTags && patch.addTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {patch.addTags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        onClick={() => setPatch((p) => ({ ...p, addTags: (p.addTags ?? []).filter((x) => x !== t) }))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {fieldCount > 0 && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-2 text-xs text-gold">
                <Num>{fieldCount}</Num> فیلد تغییر خواهد کرد
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{T.common.cancel}</Button>
          <Button onClick={handleApply} disabled={!hasChanges || saving} className="gap-2">
            {saving ? T.common.loading : "اعمال به همه"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
