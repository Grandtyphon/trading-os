"use client";

import { useState, useRef } from "react";
import { useProfiles, saveProfile, deleteProfile, exportAllData, importAllData, clearAllData, seedSampleData, clearPracticeData } from "@/hooks/use-data";
import { db } from "@/lib/dexie";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PROFILE_TYPE_META } from "@/lib/constants";
import { tradesToCSV, backtestsToCSV, downloadCSV } from "@/lib/csv";
import { Num, SectionHeader } from "@/components/shared/ui-bits";
import { toPersianDigits } from "@/lib/calendar";
import { ThemePicker } from "@/components/shared/theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings as SettingsIcon, Plus, Trash2, Download, Upload, Moon, Sun,
  Calendar as CalIcon, Hash, Database, Pencil, Building2, Sparkles, FileSpreadsheet, Dumbbell,
  AlertTriangle, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, ProfileType } from "@/lib/types";
import { uid } from "@/lib/dexie";

const COLOR_DOT: Record<string, string> = {
  live: "bg-emerald-500",
  demo: "bg-sky-500",
  backtest: "bg-violet-500",
  prop: "bg-amber-500",
};

export function SettingsSection() {
  const profiles = useProfiles();
  const { theme, setTheme, calendarMode, setCalendarMode, persianDigits, setPersianDigits, activeProfileId, lastBackupAt, markBackupDone } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile>({ id: "", name: "", type: "live", createdAt: Date.now(), propRules: null });
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPracticeOpen, setClearPracticeOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ id: uid(), name: "", type: "live", createdAt: Date.now(), propRules: null });
    setDialogOpen(true);
  };
  const openEdit = (p: Profile) => {
    setEditing(p);
    setForm(p);
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("نام پروفایل رو وارد کن");
      return;
    }
    await saveProfile(form);
    toast.success(editing ? "پروفایل به‌روز شد" : "پروفایل ساخته شد");
    setDialogOpen(false);
  };
  const handleDelete = async (id: string) => {
    await deleteProfile(id);
    toast.success("پروفایل و داده‌هاش حذف شد");
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    markBackupDone();
    toast.success("فایل پشتیبان دانلود شد");
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      toast.success("داده‌ها بارگذاری شد");
    } catch {
      toast.error("فایل نامعتبره");
    }
  };

  const handleClear = async () => {
    await clearAllData();
    toast.success("همه داده‌ها پاک شد");
    setClearOpen(false);
  };

  // active profile for practice-scope clear (falls back to first profile)
  const practiceProfile = profiles?.find((p) => p.id === activeProfileId) ?? profiles?.[0];

  const handleClearPractice = async () => {
    if (!practiceProfile) {
      toast.error("پروفایلی وجود نداره");
      setClearPracticeOpen(false);
      return;
    }
    const res = await clearPracticeData(practiceProfile.id);
    const total = res.entries + res.todos;
    toast.success(
      total > 0
        ? `${total} مورد رشد پاک شد`
        : "داده‌ای برای پاک کردن نبود"
    );
    setClearPracticeOpen(false);
  };

  const handleSeed = async () => {
    // seed into the profile the user is actually looking at — falls back to the
    // first live profile only when no profile is active (intuitive target)
    const target =
      profiles?.find((p) => p.id === activeProfileId) ??
      profiles?.find((p) => p.type === "live") ??
      profiles?.[0];
    if (!target) {
      toast.error("اول یه پروفایل بساز");
      return;
    }
    const res = await seedSampleData(target.id);
    toast.success(`${res.trades} ترید، ${res.journals} یادداشت، ${res.practices} چک‌این و ${res.todos} کار نمونه به «${target.name}» اضافه شد`);
  };

  const handleExportCSV = async (profileId: string, profileName: string, type: "trades" | "backtests") => {
    try {
      if (type === "trades") {
        const trades = await db.trades.where("profileId").equals(profileId).toArray();
        if (trades.length === 0) {
          toast.error("تریدی برای خروجی وجود نداره");
          return;
        }
        const csv = tradesToCSV(trades);
        downloadCSV(csv, `trades-${profileName}-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success(`${trades.length} ترید به CSV خروجی داده شد`);
      } else {
        const bts = await db.backtests.where("profileId").equals(profileId).toArray();
        if (bts.length === 0) {
          toast.error("بک‌تستی برای خروجی وجود نداره");
          return;
        }
        const csv = backtestsToCSV(bts);
        downloadCSV(csv, `backtests-${profileName}-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success(`${bts.length} بک‌تست به CSV خروجی داده شد`);
      }
    } catch {
      toast.error("خطا در خروجی CSV");
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title={T.settings.title} icon={<SettingsIcon className="h-5 w-5" />} />

      {/* Appearance */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{T.settings.appearance}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {T.settings.theme}
            </span>
            <div className="flex gap-1 rounded-lg border p-0.5">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    theme === t ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {t === "dark" ? T.settings.dark : T.settings.light}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <CalIcon className="h-4 w-4" />
              {T.settings.calendar}
            </span>
            <div className="flex gap-1 rounded-lg border p-0.5">
              {(["jalali", "gregorian"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setCalendarMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    calendarMode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {m === "jalali" ? T.settings.jalali : T.settings.gregorian}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4" />
              {T.settings.persianDigits}
            </span>
            <Switch checked={persianDigits} onCheckedChange={setPersianDigits} />
          </div>
        </div>
      </Card>

      {/* Neon Theme Picker */}
      <ThemePicker />

      {/* Profiles */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{T.settings.profiles}</h3>
          <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {T.settings.addProfile}
          </Button>
        </div>
        <div className="space-y-2">
          {profiles?.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", COLOR_DOT[p.type])} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{PROFILE_TYPE_META[p.type].label} · {PROFILE_TYPE_META[p.type].desc}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {!profiles && <p className="py-3 text-sm text-muted-foreground">{T.common.loading}</p>}
        </div>
      </Card>

      {/* Data management */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4" />
          {T.settings.dataManagement}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {T.settings.exportData}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            {T.settings.importData}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={handleSeed} className="col-span-2 gap-2 border-gold/40 text-gold hover:bg-gold/10">
            <Sparkles className="h-4 w-4" />
            افزودن داده‌ی نمونه (۲۸ ترید + ۸ یادداشت + ۱۲ چک‌این + ۵ کار/هدف)
          </Button>
          <Button variant="outline" onClick={() => setClearOpen(true)} className="col-span-2 gap-2 text-rose-500 hover:bg-rose-500/10">
            <Trash2 className="h-4 w-4" />
            {T.settings.clearData}
          </Button>
          <Button
            variant="outline"
            onClick={() => setClearPracticeOpen(true)}
            disabled={!practiceProfile}
            className="col-span-2 gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
            title={practiceProfile ? `پروفایل: ${practiceProfile.name}` : undefined}
          >
            <Dumbbell className="h-4 w-4" />
            {T.settings.clearPractice}
            {practiceProfile && (
              <span className="text-[10px] font-normal text-muted-foreground">({practiceProfile.name})</span>
            )}
          </Button>
        </div>

        {/* Backup freshness — local-first data safety reminder */}
        {(() => {
          const days = lastBackupAt
            ? Math.floor((Date.now() - lastBackupAt) / 86_400_000)
            : null;
          const stale = days === null || days > 14;
          const label =
            days === null
              ? T.settings.noBackupYet
              : days === 0
                ? T.settings.backupToday
                : `${toPersianDigits(days)} روز پیش`;
          return (
            <div
              className={cn(
                "mt-3 flex items-start gap-2.5 rounded-xl border p-3",
                stale
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-emerald-500/25 bg-emerald-500/5"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  stale ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"
                )}
              >
                {stale ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {T.settings.lastBackup}:{" "}
                  <span className={stale ? "text-amber-500" : "text-emerald-500"} dir="rtl">
                    <Num>{label}</Num>
                  </span>
                </p>
                {stale && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {T.settings.backupStaleHint}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* CSV Export */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-gold" />
          خروجی CSV (اکسل)
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          تریدها یا بک‌تست‌های هر پروفایل رو به‌صورت فایل CSV خروجی بگیر برای آنالیز در اکسل یا Google Sheets
        </p>
        <div className="space-y-2">
          {profiles?.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", COLOR_DOT[p.type])} />
              <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
              {p.type !== "backtest" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => handleExportCSV(p.id, p.name, "trades")}
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  تریدها
                </Button>
              )}
              {p.type === "backtest" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => handleExportCSV(p.id, p.name, "backtests")}
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  بک‌تست‌ها
                </Button>
              )}
            </div>
          ))}
          {!profiles && <p className="py-2 text-sm text-muted-foreground">{T.common.loading}</p>}
        </div>
      </Card>

      {/* About */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-primary/10 ring-1 ring-gold/30">
            <Building2 className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold">{T.appName}</p>
            <p className="text-xs text-muted-foreground">{T.appTagline}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              تمام داده‌ها به‌صورت آفلاین روی همین دستگاه ذخیره می‌شن (IndexedDB). فقط بخش «منتور» برای تحلیل به اینترنت نیاز داره.
              می‌تونی با گزینه خروجی، از داده‌هات پشتیبان بگیری.
            </p>
          </div>
        </div>
      </Card>

      {/* Profile dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">{editing ? T.common.edit : T.settings.addProfile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{T.common.profile}</Label>
              <Input dir="rtl" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: لایو — اصلی" />
            </div>
            <div className="space-y-1.5">
              <Label>نوع پروفایل</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROFILE_TYPE_META) as ProfileType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border-2 p-2.5 text-sm transition-colors",
                      form.type === t ? "border-accent bg-accent/30" : "border-border"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", COLOR_DOT[t])} />
                    <span className="flex-1 text-right">{PROFILE_TYPE_META[t].label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>{T.common.cancel}</Button>
            <Button onClick={handleSave}>{T.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.settings.clearData}</AlertDialogTitle>
            <AlertDialogDescription>{T.settings.clearConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-rose-500 hover:bg-rose-600">
              {T.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearPracticeOpen} onOpenChange={setClearPracticeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-amber-500" />
              {T.settings.clearPractice}
              {practiceProfile && <span className="text-muted-foreground">({practiceProfile.name})</span>}
            </AlertDialogTitle>
            <AlertDialogDescription>{T.settings.clearPracticeConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearPractice} className="bg-amber-500 hover:bg-amber-600">
              {T.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
