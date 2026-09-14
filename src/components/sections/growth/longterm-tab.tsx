"use client";

// ============================================================================
// Growth — «بلندمدت» tab: open-ended goals with optional target dates, countdown
// chips, move-to-today, and a celebratory achieved section.
// ============================================================================

import { useMemo, useState } from "react";
import { saveTodo, toggleTodo, deleteTodo, moveTodoToToday } from "@/hooks/use-data";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { todayStart } from "@/lib/habits";
import type { Todo } from "@/lib/types";
import { toPersianDigits } from "@/lib/calendar";
import { Num, DateText, EmptyState } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Target, Plus, Check, Pencil, Trash2, CalendarDays, ChevronDown, Trophy,
  CalendarPlus, Sparkles, Infinity as InfinityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { uid } from "@/lib/dexie";
import moment from "jalali-moment";

const DAY = 86_400_000;

interface LongtermTabProps {
  todos: Todo[] | undefined;
  profileId: string;
  canWrite: boolean;
  calMode: "jalali" | "gregorian";
}

/** Countdown chip meta for a target date: text + tone. */
function targetMeta(targetDate: number, today: number): { cls: string; days: number } | null {
  const days = Math.round((targetDate - today) / DAY);
  return { cls: days < 0 ? "over" : days <= 7 ? "soon" : "far", days };
}

export function LongtermTab({ todos, profileId, canWrite, calMode }: LongtermTabProps) {
  const today = todayStart();

  const goals = useMemo(() => {
    const list = (todos ?? []).filter((t) => t.scope === "longterm" && !t.done);
    // goals with the nearest deadline first, then oldest-created
    return list.sort((a, b) => {
      const at = a.targetDate ?? Infinity;
      const bt = b.targetDate ?? Infinity;
      if (at !== bt) return at - bt;
      return a.createdAt - b.createdAt;
    });
  }, [todos]);

  const achieved = useMemo(() => {
    const list = (todos ?? []).filter((t) => t.scope === "longterm" && t.done);
    return list.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  }, [todos]);

  // ---- quick add ----
  const [draft, setDraft] = useState("");
  const addGoal = () => {
    const text = draft.trim();
    if (!canWrite) {
      toast.error(T.practice.needProfile);
      return;
    }
    if (!text) return;
    const now = Date.now();
    setDraft("");
    void saveTodo({
      id: uid(),
      profileId,
      scope: "longterm",
      text: text.slice(0, 120),
      note: "",
      done: false,
      date: today,
      targetDate: null,
      reminderTime: null,
      doneAt: null,
      createdAt: now,
      updatedAt: now,
    }).catch(() => toast.error("خطا در ذخیره"));
  };

  const handleToggle = async (t: Todo) => {
    if (!canWrite) {
      toast.error(T.practice.needProfile);
      return;
    }
    const updated = await toggleTodo(t);
    if (updated.done) {
      toast.success(T.practice.goalDoneToast, {
        description: t.text,
        action: { label: T.practice.undo, onClick: () => void saveTodo(t) },
      });
    } else {
      toast(T.practice.todoReopened, { description: t.text });
    }
  };

  const handleMoveToToday = async (t: Todo) => {
    if (!canWrite) {
      toast.error(T.practice.needProfile);
      return;
    }
    const next = await moveTodoToToday(t);
    toast.success(T.practice.movedToToday, {
      description: next.text,
      action: { label: T.practice.undo, onClick: () => void saveTodo(t) },
    });
  };

  const handleDelete = async (t: Todo) => {
    if (!canWrite) {
      toast.error(T.practice.needProfile);
      return;
    }
    await deleteTodo(t.id);
    toast.success(T.practice.todoDeletedToast, {
      description: t.text,
      action: { label: T.practice.undo, onClick: () => void saveTodo(t) },
    });
  };

  // ---- edit dialog ----
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTarget, setEditTarget] = useState<string>("");

  const openEdit = (t: Todo) => {
    setEditing(t);
    setEditText(t.text);
    setEditNote(t.note);
    setEditTarget(t.targetDate ? moment(t.targetDate).format("YYYY-MM-DD") : "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const text = editText.trim();
    if (!text) {
      toast.error(T.practice.todoTextRequired);
      return;
    }
    let targetDate: number | null = null;
    if (editTarget) {
      const m = moment(editTarget, "YYYY-MM-DD");
      if (m.isValid()) targetDate = m.startOf("day").valueOf();
    }
    await saveTodo({
      ...editing,
      text: text.slice(0, 120),
      note: editNote.trim().slice(0, 200),
      targetDate,
      updatedAt: Date.now(),
    });
    toast.success(T.practice.todoSaved, { description: text });
    setEditOpen(false);
  };

  // ---- achieved collapsible ----
  const [achievedOpen, setAchievedOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* ============ quick add ============ */}
      <Card className="border-border/60 p-2.5 transition-all focus-within:border-gold/40 focus-within:shadow-[0_0_16px_color-mix(in_oklab,var(--gold)_10%,transparent)]">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            onClick={addGoal}
            disabled={!draft.trim()}
            aria-label={T.practice.addGoal}
            className={cn(
              "h-9 w-9 shrink-0 rounded-xl transition-all",
              draft.trim()
                ? "bg-gold text-[#1a1408] shadow-[0_0_14px_color-mix(in_oklab,var(--gold)_30%,transparent)] hover:bg-gold/90"
                : "bg-muted/40 text-muted-foreground/50"
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </Button>
          <Input
            dir="rtl"
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addGoal();
            }}
            placeholder={T.practice.addGoalPh}
            className="h-9 border-transparent bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </Card>

      {/* ============ active goals ============ */}
      {goals.length === 0 && todos !== undefined ? (
        <EmptyState
          icon={<Target className="h-7 w-7 animate-soft-pulse text-gold/70" />}
          title={T.practice.goalsEmptyTitle}
          hint={T.practice.goalsEmptyHint}
        />
      ) : (
        <div className="space-y-2">
          {goals.map((t, idx) => {
            const meta = t.targetDate ? targetMeta(t.targetDate, today) : null;
            const countdown = (() => {
              if (!meta) return null;
              const { days, cls } = meta;
              if (cls === "over") return { cls, label: <><Num>{Math.abs(days)}</Num> {T.practice.daysPast}</> };
              if (days === 0) return { cls, label: "امروز" };
              return { cls, label: <><Num>{days}</Num> {T.practice.daysLeft}</> };
            })();
            return (
              <Card
                key={t.id}
                className="group animate-fade-up border-border/60 p-3 transition-all card-lift hover:border-gold/25"
                style={{ animationDelay: `${Math.min(idx * 30, 180)}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  {/* complete */}
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    disabled={!canWrite}
                    aria-pressed={false}
                    aria-label={`${T.practice.goalAchieved} — ${t.text}`}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                      "border-border/70 bg-muted/30 text-transparent hover:border-emerald-500/50 hover:bg-emerald-500/10",
                      canWrite && "cursor-pointer active:scale-90",
                      !canWrite && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold leading-snug text-foreground">{t.text}</p>
                      {countdown && (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                            countdown.cls === "over"
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                              : countdown.cls === "soon"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          )}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {countdown.label}
                        </span>
                      )}
                      {!t.targetDate && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/80">
                          <InfinityIcon className="h-3 w-3" />
                          {T.practice.noTargetDate}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {t.targetDate && (
                        <span className="text-[10px] text-muted-foreground">
                          <DateText ts={t.targetDate} />
                        </span>
                      )}
                      {t.note && (
                        <>
                          {t.targetDate && <span className="text-muted-foreground/40">·</span>}
                          <span className="max-w-[240px] truncate text-[10px] text-muted-foreground/70" title={t.note}>{t.note}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* row actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-gold"
                      onClick={() => handleMoveToToday(t)}
                      aria-label={T.practice.moveToToday}
                      title={T.practice.moveToToday}
                      disabled={!canWrite}
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => openEdit(t)}
                      aria-label={T.practice.editGoal}
                      title={T.practice.editGoal}
                      disabled={!canWrite}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-rose-500"
                      onClick={() => handleDelete(t)}
                      aria-label={T.common.delete}
                      title={T.common.delete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============ achieved goals (collapsible) ============ */}
      {achieved.length > 0 && (
        <Card className="border-border/60 p-3">
          <button
            onClick={() => setAchievedOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2"
            aria-expanded={achievedOpen}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Trophy className="h-4 w-4 text-gold/70" />
              {T.practice.achievedSection}
              <Badge variant="outline" className="h-4 border-gold/30 bg-gold/10 px-1.5 text-[9px] font-semibold text-gold">
                <Num>{achieved.length}</Num>
              </Badge>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-300", achievedOpen && "rotate-180")} />
          </button>
          {achievedOpen && (
            <div className="mt-2.5 animate-fade-up space-y-1.5">
              {achieved.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-2.5 rounded-xl border border-gold/15 bg-gold/5 px-2.5 py-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-muted-foreground line-through decoration-gold/50">{t.text}</p>
                    {t.doneAt !== null && (
                      <p className="text-[9px] text-muted-foreground/60">
                        <DateText ts={t.doneAt} withTime />
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => handleToggle(t)}
                      aria-label={T.practice.todoReopened}
                      title={T.practice.todoReopened}
                      disabled={!canWrite}
                    >
                      <CalendarPlus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-rose-500"
                      onClick={() => handleDelete(t)}
                      aria-label={T.common.delete}
                      title={T.common.delete}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ============ edit dialog ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-right">{T.practice.editGoal}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                {T.practice.todoText}
                <span className="text-rose-500"> *</span>
              </Label>
              <Input
                dir="rtl"
                value={editText}
                maxLength={120}
                onChange={(e) => setEditText(e.target.value)}
                className="focus-visible:ring-gold/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{T.practice.todoNoteLabel}</Label>
              <Input
                dir="rtl"
                value={editNote}
                maxLength={200}
                onChange={(e) => setEditNote(e.target.value)}
                className="focus-visible:ring-gold/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{T.practice.targetDateLabel}</Label>
              <Input
                type="date"
                dir="ltr"
                className="text-left focus-visible:ring-gold/40"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="border-t px-5 py-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{T.common.cancel}</Button>
            <Button onClick={saveEdit}>{T.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
