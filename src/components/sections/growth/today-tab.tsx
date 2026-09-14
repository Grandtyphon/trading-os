"use client";

// ============================================================================
// Growth — «امروز» tab: one-off daily to-dos (rollover until done) + a compact
// habits-today strip linking into the habits tab. Zero-friction by design:
// quick-add with Enter, tap to complete (<2s), undo on every action.
// ============================================================================

import { useMemo, useState } from "react";
import { saveTodo, toggleTodo, deleteTodo } from "@/hooks/use-data";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { todayStart } from "@/lib/habits";
import type { Todo } from "@/lib/types";
import { formatDateShort, toPersianDigits } from "@/lib/calendar";
import { Num, DateText, EmptyState } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Sun, Plus, Check, Pencil, Trash2, History, Clock, Flame, ChevronDown,
  ChevronLeft, CheckCheck, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { uid } from "@/lib/dexie";

const DAY = 86_400_000;

interface TodayTabProps {
  todos: Todo[] | undefined;
  profileId: string;
  canWrite: boolean;
  calMode: "jalali" | "gregorian";
  habitsToday: { done: number; due: number };
  onGoToHabits: () => void;
}

export function TodayTab({ todos, profileId, canWrite, calMode, habitsToday, onGoToHabits }: TodayTabProps) {
  const today = todayStart();

  // ---- derived lists (rollover: any open today-todo from a past day stays visible) ----
  const openToday = useMemo(() => {
    const list = (todos ?? []).filter((t) => t.scope === "today" && !t.done);
    return list.sort((a, b) => a.createdAt - b.createdAt);
  }, [todos]);

  const doneToday = useMemo(() => {
    const list = (todos ?? []).filter(
      (t) => t.scope === "today" && t.done && t.doneAt !== null && t.doneAt >= today
    );
    return list.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  }, [todos, today]);

  const totalToday = openToday.length + doneToday.length;
  const percent = totalToday > 0 ? Math.round((doneToday.length / totalToday) * 100) : 0;
  const allDone = totalToday > 0 && openToday.length === 0;

  const overdue = useMemo(
    () => openToday.filter((t) => t.date < today),
    [openToday, today]
  );

  // ---- quick add ----
  const [draft, setDraft] = useState("");
  const addTodo = () => {
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
      scope: "today",
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

  // ---- optimistic done set — keeps the tapped row visible (popping) while liveQuery lands ----
  const [justDone, setJustDone] = useState<Set<string>>(new Set());
  const [justPopped, setJustPopped] = useState<string | null>(null);

  const handleToggle = async (t: Todo) => {
    if (!canWrite) {
      toast.error(T.practice.needProfile);
      return;
    }
    if (!t.done) {
      // optimistic: animate while the row travels to the done list
      setJustDone((s) => new Set(s).add(t.id));
      setJustPopped(t.id);
      window.setTimeout(() => {
        setJustDone((s) => {
          const n = new Set(s);
          n.delete(t.id);
          return n;
        });
      }, 1200);
      window.setTimeout(() => setJustPopped((p) => (p === t.id ? null : p)), 1200);
    }
    const updated = await toggleTodo(t);
    if (updated.done) {
      toast.success(T.practice.todoDoneToast, {
        description: t.text,
        action: { label: T.practice.undo, onClick: () => void saveTodo(t) },
      });
    } else {
      toast(T.practice.todoReopened, { description: t.text });
    }
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

  const clearDoneToday = async () => {
    if (!canWrite || doneToday.length === 0) return;
    const removed = [...doneToday];
    for (const t of removed) await deleteTodo(t.id);
    toast.success(T.practice.todosCleared, {
      description: `${toPersianDigits(removed.length)} مورد`,
      action: {
        label: T.practice.undo,
        onClick: () => {
          for (const t of removed) void saveTodo(t);
        },
      },
    });
  };

  // ---- edit dialog ----
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editReminder, setEditReminder] = useState("");

  const openEdit = (t: Todo) => {
    setEditing(t);
    setEditText(t.text);
    setEditNote(t.note);
    setEditReminder(t.reminderTime ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const text = editText.trim();
    if (!text) {
      toast.error(T.practice.todoTextRequired);
      return;
    }
    await saveTodo({
      ...editing,
      text: text.slice(0, 120),
      note: editNote.trim().slice(0, 200),
      reminderTime: editReminder || null,
      updatedAt: Date.now(),
    });
    toast.success(T.practice.todoSaved, { description: text });
    setEditOpen(false);
  };

  // ---- done-today collapsible ----
  const [doneOpen, setDoneOpen] = useState(true);

  const habitsPct = habitsToday.due > 0 ? Math.round((habitsToday.done / habitsToday.due) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ============ progress header ============ */}
      <Card className={cn(
        "relative overflow-hidden border-border/60 p-4 transition-all",
        allDone && "border-emerald-500/25"
      )}>
        {allDone && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,color-mix(in_oklab,#10b981_7%,transparent),transparent_55%)]"
          />
        )}
        <div className="relative flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all",
            allDone
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-gold/25 bg-gold/10 text-gold"
          )}>
            <Sun className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">{T.practice.todayProgress}</p>
              {allDone ? (
                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-500">
                  <Sparkles className="h-3 w-3" />
                  {T.practice.todayAllDone}
                </Badge>
              ) : totalToday > 0 ? (
                <Badge variant="outline" className={cn(
                  "gap-1 text-[10px]",
                  doneToday.length > 0
                    ? "border-gold/30 bg-gold/10 text-gold"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}>
                  <Num>{doneToday.length}</Num>
                  <span className="text-muted-foreground/60">از</span>
                  <Num>{totalToday}</Num>
                  {T.practice.doneOf}
                </Badge>
              ) : null}
              {overdue.length > 0 && (
                <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-500">
                  <History className="h-3 w-3" />
                  {T.practice.todoOverdue}: <Num>{overdue.length}</Num>
                </Badge>
              )}
            </div>
            <div
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted-foreground/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={totalToday > 0 ? percent : undefined}
              aria-label={T.practice.todayProgress}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  allDone
                    ? "bg-gradient-to-l from-emerald-500/90 via-emerald-500/60 to-emerald-500/30"
                    : "bg-gradient-to-l from-gold/90 via-gold/60 to-gold/30"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          {totalToday > 0 && (
            <span className="num shrink-0 text-lg font-extrabold tabular-nums text-gold">
              <Num>{percent}</Num>
              <span className="text-[10px] font-bold">٪</span>
            </span>
          )}
        </div>
      </Card>

      {/* ============ quick add ============ */}
      <Card className="border-border/60 p-2.5 transition-all focus-within:border-gold/40 focus-within:shadow-[0_0_16px_color-mix(in_oklab,var(--gold)_10%,transparent)]">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            onClick={addTodo}
            disabled={!draft.trim()}
            aria-label={T.practice.addTodo}
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
              if (e.key === "Enter") addTodo();
            }}
            placeholder={T.practice.addTodoPh}
            className="h-9 border-transparent bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </Card>

      {/* ============ open list ============ */}
      {openToday.length === 0 && totalToday === 0 && todos !== undefined ? (
        <EmptyState
          icon={<Sun className="h-7 w-7 animate-soft-pulse text-gold/70" />}
          title={T.practice.todosEmptyTitle}
          hint={T.practice.todosEmptyHint}
        />
      ) : (
        <div className="space-y-2">
          {openToday.map((t, idx) => {
            const daysOld = Math.round((today - t.date) / DAY);
            const isOverdue = daysOld >= 1;
            const optimistic = justDone.has(t.id);
            return (
              <Card
                key={t.id}
                className="group animate-fade-up border-border/60 p-2.5 transition-all card-lift hover:border-gold/25"
                style={{ animationDelay: `${Math.min(idx * 30, 180)}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  {/* tap to complete */}
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    disabled={!canWrite}
                    aria-pressed={optimistic}
                    aria-label={`${T.practice.checkIn} — ${t.text}`}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                      optimistic
                        ? "border-emerald-500/60 bg-emerald-500 text-white shadow-[0_0_14px_color-mix(in_oklab,#10b981_40%,transparent)]"
                        : "border-border/70 bg-muted/30 text-transparent hover:border-emerald-500/50 hover:bg-emerald-500/10",
                      canWrite && "cursor-pointer active:scale-90",
                      !canWrite && "cursor-not-allowed opacity-50",
                      optimistic && justPopped === t.id && "animate-check-pop"
                    )}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={cn(
                        "text-sm font-semibold leading-snug text-foreground transition-colors",
                        optimistic && "text-muted-foreground line-through decoration-emerald-500/60"
                      )}>
                        {t.text}
                      </p>
                      {isOverdue && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500"
                          title={formatDateShort(t.date, calMode)}
                        >
                          <History className="h-3 w-3" />
                          {daysOld === 1 ? T.practice.overdueChip : <><Num>{daysOld}</Num> {T.practice.overdueDaysChip}</>}
                        </span>
                      )}
                      {t.reminderTime && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground" title={T.practice.reminderHint}>
                          <Clock className="h-3 w-3" />
                          <span dir="ltr" className="num">{t.reminderTime}</span>
                        </span>
                      )}
                    </div>
                    {t.note && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70" title={t.note}>{t.note}</p>
                    )}
                  </div>

                  {/* row actions */}
                  <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => openEdit(t)}
                      aria-label={T.practice.editTodo}
                      title={T.practice.editTodo}
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

      {/* ============ done today (collapsible) ============ */}
      {doneToday.length > 0 && (
        <Card className="border-border/60 p-3">
          <div className="flex w-full items-center justify-between gap-2">
            <button
              onClick={() => setDoneOpen((v) => !v)}
              className="flex min-w-0 items-center gap-2 text-sm font-bold text-muted-foreground"
              aria-expanded={doneOpen}
            >
              <CheckCheck className="h-4 w-4 shrink-0 text-emerald-500/80" />
              {T.practice.doneToday}
              <Badge variant="outline" className="h-4 shrink-0 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[9px] font-semibold text-emerald-500">
                <Num>{doneToday.length}</Num>
              </Badge>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-300", doneOpen && "rotate-180")} />
            </button>
            <button
              type="button"
              onClick={() => void clearDoneToday()}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:border-rose-500/40 hover:text-rose-500 active:scale-95"
              title={T.practice.clearDone}
            >
              <Trash2 className="h-3 w-3" />
              {T.practice.clearDone}
            </button>
          </div>
          {doneOpen && (
            <div className="mt-2.5 animate-fade-up space-y-1.5">
              {doneToday.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-2"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    disabled={!canWrite}
                    aria-label={`${T.practice.todoReopened} — ${t.text}`}
                    title={T.practice.todoReopened}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-500 text-white transition-all hover:bg-emerald-500/80",
                      canWrite && "cursor-pointer active:scale-90",
                      !canWrite && "cursor-not-allowed"
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-muted-foreground line-through decoration-emerald-500/50">{t.text}</p>
                    {t.doneAt !== null && (
                      <p className="text-[9px] text-muted-foreground/60">
                        <DateText ts={t.doneAt} withTime />
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openEdit(t)}
                      aria-label={T.practice.editTodo}
                      title={T.practice.editTodo}
                    >
                      <Pencil className="h-3 w-3" />
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

      {/* ============ habits today strip ============ */}
      <Card className="relative overflow-hidden border-border/60 p-3 transition-all hover:border-gold/25">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--gold)_5%,transparent),transparent_55%)]"
        />
        <div className="relative flex items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all",
            habitsToday.due > 0 && habitsToday.done === habitsToday.due
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-gold/25 bg-gold/10 text-gold"
          )}>
            <Flame className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs font-bold text-foreground">{T.practice.habitsMiniTitle}</p>
              {habitsToday.due === 0 ? (
                <Badge variant="outline" className="border-border bg-muted/40 text-[10px] text-muted-foreground">
                  <Sun className="h-3 w-3" />
                  {T.practice.noHabitsDue}
                </Badge>
              ) : habitsToday.done === habitsToday.due ? (
                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-500">
                  <Sparkles className="h-3 w-3" />
                  {T.practice.habitsMiniAll}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-gold/30 bg-gold/10 text-[10px] text-gold">
                  <Num>{habitsToday.done}</Num>
                  <span className="text-muted-foreground/60">از</span>
                  <Num>{habitsToday.due}</Num>
                  {T.practice.doneOf}
                </Badge>
              )}
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-muted-foreground/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={habitsToday.due}
              aria-valuenow={habitsToday.done}
              aria-label={T.practice.habitsMiniTitle}
            >
              <div
                className="h-full rounded-full bg-gradient-to-l from-gold/90 via-gold/60 to-gold/30 transition-all duration-500"
                style={{ width: `${habitsPct}%` }}
              />
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={onGoToHabits}
            className="shrink-0 gap-1 border-gold/30 text-[11px] text-gold transition-all hover:bg-gold/10 active:scale-95"
          >
            {T.practice.goToHabits}
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>

      {/* ============ edit dialog ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-right">{T.practice.editTodo}</DialogTitle>
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
              <Label className="text-xs font-medium text-muted-foreground">{T.practice.reminderTime}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  dir="ltr"
                  value={editReminder}
                  onChange={(e) => setEditReminder(e.target.value)}
                  className="max-w-[140px] text-left focus-visible:ring-gold/40"
                />
                {editReminder && (
                  <button
                    type="button"
                    onClick={() => setEditReminder("")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="X"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70">{T.practice.reminderHint}</p>
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
