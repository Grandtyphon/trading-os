"use client";

import { useState } from "react";
import type { SectionId } from "@/store/use-app-store";
import { useAppStore } from "@/store/use-app-store";
import { useProfiles } from "@/hooks/use-data";
import { T } from "@/lib/i18n";
import { formatRelative } from "@/lib/calendar";
import { PROFILE_TYPE_META, PROFILE_TYPE_COLOR } from "@/lib/constants";
import { getAtmosphere, nextAtmosphere } from "@/lib/themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Bot,
  CalendarDays,
  Grid3x3,
  Wrench,
  FileText,
  BookHeart,
  FlaskConical,
  TrendingUp,
  ShieldAlert,
  Building2,
  Sprout,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Check,
  Clock,
  Keyboard,
  SwatchBook,
} from "lucide-react";

// Section quick-navigation — same ids/labels as the app-shell nav, plus latin
// keywords so the palette matches both Persian and English typing.
interface PaletteCommand {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  keywords: string;
}

const PRIMARY_COMMANDS: PaletteCommand[] = [
  { id: "dashboard", label: T.nav.dashboard, icon: <LayoutDashboard className="h-4 w-4 text-current" />, keywords: "dashboard home dash داشبورد" },
  { id: "journal", label: T.nav.journal, icon: <BookOpen className="h-4 w-4 text-current" />, keywords: "journal trades log ژورنال معاملات" },
  { id: "practice", label: T.nav.practice, icon: <Sprout className="h-4 w-4 text-current" />, keywords: "practice growth habit todo today goal رشد عادت امروز کار هدف" },
  { id: "mentorChat", label: "چت منتور", icon: <MessageCircle className="h-4 w-4 text-current" />, keywords: "mentor chat ai gemini چت گفتگو" },
  { id: "mentor", label: T.nav.mentor, icon: <Bot className="h-4 w-4 text-current" />, keywords: "mentor analysis ai منتور تحلیل" },
];

const MORE_COMMANDS: PaletteCommand[] = [
  { id: "calendar", label: T.nav.calendar, icon: <CalendarDays className="h-4 w-4 text-current" />, keywords: "calendar jalali date تقویم" },
  { id: "analytics", label: T.nav.analytics, icon: <Grid3x3 className="h-4 w-4 text-current" />, keywords: "analytics advanced stats chart آنالیز آمار" },
  { id: "tools", label: "ابزارها", icon: <Wrench className="h-4 w-4 text-current" />, keywords: "tools calculator risk ابزار" },
  { id: "report", label: T.nav.report, icon: <FileText className="h-4 w-4 text-current" />, keywords: "report summary خلاصه گزارش" },
  { id: "dailyJournal", label: T.nav.dailyJournal, icon: <BookHeart className="h-4 w-4 text-current" />, keywords: "daily journal note یادداشت روزانه" },
  { id: "backtest", label: T.nav.backtest, icon: <FlaskConical className="h-4 w-4 text-current" />, keywords: "backtest بک تست" },
  { id: "edgeLab", label: T.nav.edgeLab, icon: <TrendingUp className="h-4 w-4 text-current" />, keywords: "edge lab لبه یاب" },
  { id: "leakDetector", label: T.nav.leakDetector, icon: <ShieldAlert className="h-4 w-4 text-current" />, keywords: "leak detector نشتی یاب" },
  { id: "propTracker", label: T.nav.propTracker, icon: <Building2 className="h-4 w-4 text-current" />, keywords: "prop tracker firm پراپ" },
  { id: "settings", label: T.nav.settings, icon: <SettingsIcon className="h-4 w-4 text-current" />, keywords: "settings theme profile تنظیمات" },
];

const ALL_COMMANDS: PaletteCommand[] = [...PRIMARY_COMMANDS, ...MORE_COMMANDS];

const COMMAND_BY_ID = new Map<string, PaletteCommand>(ALL_COMMANDS.map((c) => [c.id, c]));

// Alt+1..9 jumps follow the ALL_NAV order (primary first, then more) — the
// first 9 sections get a shortcut; the map is shared with app-shell for hints.
const ALT_SHORTCUT: Partial<Record<SectionId, number>> = {};
ALL_COMMANDS.slice(0, 9).forEach((c, i) => {
  ALT_SHORTCUT[c.id] = i + 1;
});

/** Tiny keyboard-key chip — shared by the header trigger, nav hints and the palette footer. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 shrink-0 select-none items-center justify-center rounded border border-border/80 bg-muted/60 px-1 font-mono text-[10px] font-medium text-muted-foreground tabular-nums",
        className
      )}
    >
      {children}
    </kbd>
  );
}

/** Ctrl (⌘ on Apple) + K hotkey detector. */
export function isModK(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
}

/** Platform-aware modifier label for the kbd hints. */
export function modKeyLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

function SectionItem({
  c,
  recent = false,
  recentAt,
  onPick,
}: {
  c: PaletteCommand;
  recent?: boolean;
  recentAt?: number;
  onPick: () => void;
}) {
  const alt = ALT_SHORTCUT[c.id];
  return (
    <CommandItem
      value={`${recent ? "recent-" : ""}${c.id} ${c.label}`}
      keywords={c.keywords.split(" ")}
      onSelect={onPick}
      className="group gap-3 rounded-lg"
    >
      <span className="text-muted-foreground transition-colors group-data-[selected=true]:text-gold">{c.icon}</span>
      <span className="flex-1 text-right">{c.label}</span>
      {recent &&
        (recentAt ? (
          <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground" dir="rtl">
            {formatRelative(recentAt, "jalali", true)}
          </span>
        ) : (
          <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        ))}
      {alt !== undefined && (
        <Kbd className="hidden opacity-50 sm:inline-flex">Alt {alt}</Kbd>
      )}
    </CommandItem>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onOpenShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (id: SectionId) => void;
  onOpenShortcuts: () => void;
}) {
  const [query, setQuery] = useState("");
  const recentSections = useAppStore((s) => s.recentSections);
  const recentSectionsAt = useAppStore((s) => s.recentSectionsAt);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const atmosphere = useAppStore((s) => s.atmosphere);
  const lightAtmosphere = useAppStore((s) => s.lightAtmosphere);
  const setAtmosphere = useAppStore((s) => s.setAtmosphere);
  const setLightAtmosphere = useAppStore((s) => s.setLightAtmosphere);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const profiles = useProfiles();

  // every close (Esc / outside click / navigation) resets the query for the next open
  const handleOpenChange = (o: boolean) => {
    if (!o) setQuery("");
    onOpenChange(o);
  };

  const pick = (id: SectionId) => {
    onNavigate(id);
    handleOpenChange(false);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // cycle to the next gallery template (within the current mode's slot list —
  // ATMOSPHERES mixes dark+light, so picking a light one also flips the mode)
  const cycleAtmosphere = () => {
    const currentId = theme === "dark" ? atmosphere : lightAtmosphere;
    const next = nextAtmosphere(currentId);
    if (next.mode === "dark") {
      setAtmosphere(next.id);
      setTheme("dark");
    } else {
      setLightAtmosphere(next.id);
      setTheme("light");
    }
    toast.success(`${T.palette.themeNext}: ${next.name}`);
  };

  const recentCommands = recentSections
    .map((id) => COMMAND_BY_ID.get(id))
    .filter((c): c is PaletteCommand => Boolean(c));

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      showCloseButton={false}
      title={T.palette.dialogTitle}
      description={T.palette.dialogDesc}
      className="top-[14%] translate-y-0 gap-0 overflow-hidden rounded-2xl border-gold/25 p-0 sm:max-w-md glass-strong"
    >
      {/* gold neon edge along the top */}
      <div aria-hidden className="h-px w-full bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={T.palette.placeholder}
      />
      <CommandList className="scroll-thin py-1">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          {T.palette.empty}
        </CommandEmpty>

        {recentCommands.length > 0 && (
          <CommandGroup
            heading={T.palette.recent}
            className="[&_[cmdk-group-heading]]:text-right [&_[cmdk-group-heading]]:text-gold/70"
          >
            {recentCommands.map((c) => (
              <SectionItem
                key={`recent-${c.id}`}
                c={c}
                recent
                recentAt={recentSectionsAt[c.id]}
                onPick={() => pick(c.id)}
              />
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading={T.palette.primary} className="[&_[cmdk-group-heading]]:text-right">
          {PRIMARY_COMMANDS.map((c) => (
            <SectionItem key={c.id} c={c} onPick={() => pick(c.id)} />
          ))}
        </CommandGroup>
        <CommandSeparator className="my-1" />
        <CommandGroup heading={T.palette.more} className="[&_[cmdk-group-heading]]:text-right">
          {MORE_COMMANDS.map((c) => (
            <SectionItem key={c.id} c={c} onPick={() => pick(c.id)} />
          ))}
        </CommandGroup>

        <CommandSeparator className="my-1" />
        <CommandGroup heading={T.palette.actions} className="[&_[cmdk-group-heading]]:text-right">
          {/* keyboard cheatsheet — opens the shortcuts dialog, closes the palette */}
          <CommandItem
            value="action-shortcuts"
            keywords={["shortcuts", "keys", "کلید", "میان‌بر", "راهنما", "help", "keyboard"]}
            onSelect={() => {
              handleOpenChange(false);
              onOpenShortcuts();
            }}
            className="group gap-3 rounded-lg"
          >
            <span className="text-muted-foreground transition-colors group-data-[selected=true]:text-gold">
              <Keyboard className="h-4 w-4 text-current" />
            </span>
            <span className="flex-1 text-right">{T.shortcuts.openHelp}</span>
            <Kbd>?</Kbd>
          </CommandItem>
          {/* theme toggle — a repeatable toggle, so the palette stays open */}
          <CommandItem
            value="action-theme"
            keywords={["theme", "تم", "روشن", "تیره", "dark", "light", "حالت", "night", "شب"]}
            onSelect={toggleTheme}
            className="group gap-3 rounded-lg"
          >
            <span className="text-muted-foreground transition-colors group-data-[selected=true]:text-gold">
              {theme === "dark" ? <Sun className="h-4 w-4 text-current" /> : <Moon className="h-4 w-4 text-current" />}
            </span>
            <span className="flex-1 text-right">
              {theme === "dark" ? T.palette.themeToLight : T.palette.themeToDark}
            </span>
          </CommandItem>
          {/* next theme template — cycles the full-look atmosphere gallery */}
          <CommandItem
            value="action-theme-next"
            keywords={["theme", "atmosphere", "قالب", "گالری", "تم", "رنگ", "تم بعدی", "next", "style", "حالت"]}
            onSelect={cycleAtmosphere}
            className="group gap-3 rounded-lg"
          >
            <span className="text-muted-foreground transition-colors group-data-[selected=true]:text-gold">
              <SwatchBook className="h-4 w-4 text-current" />
            </span>
            <span className="flex-1 text-right">{T.palette.themeNext}</span>
            <span className="text-[10px] text-muted-foreground">{getAtmosphere(theme === "dark" ? atmosphere : lightAtmosphere).name}</span>
          </CommandItem>
          {/* profile switching — selection semantics, closes the palette */}
          {profiles?.map((p) => (
            <CommandItem
              key={`profile-${p.id}`}
              value={`profile-${p.id} ${p.name}`}
              keywords={["profile", "پروفایل", "حساب", "switch", p.name]}
              onSelect={() => {
                setActiveProfile(p.id);
                handleOpenChange(false);
              }}
              className="group gap-3 rounded-lg"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                <span className={cn("h-2 w-2 rounded-full", PROFILE_TYPE_COLOR[p.type])} />
              </span>
              <span className="flex-1 truncate text-right">{p.name}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {PROFILE_TYPE_META[p.type].label}
              </span>
              {p.id === activeProfileId && <Check className="h-3.5 w-3.5 shrink-0 text-accent-foreground" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      {/* footer keyboard hints */}
      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>/</Kbd>
          {T.palette.slashHint}
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {T.palette.navigate}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>Alt</Kbd>
          <Kbd>1-9</Kbd>
          {T.palette.jumpHint}
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd>
          {T.palette.select}
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Esc</Kbd>
          {T.palette.close}
        </span>
      </div>
    </CommandDialog>
  );
}
