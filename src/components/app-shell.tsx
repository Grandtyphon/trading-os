"use client";

import { useEffect, useState } from "react";
import { useAppStore, type SectionId } from "@/store/use-app-store";
import { useProfiles, useEnsureSeed } from "@/hooks/use-data";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  TrendingUp,
  ShieldAlert,
  Building2,
  Bot,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  ChevronDown,
  MoreHorizontal,
  Plus,
  CalendarDays,
  BookHeart,
  Grid3x3,
  FileText,
  MessageCircle,
  Wrench,
  Sprout,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileSwitcher } from "@/components/shared/profile-switcher";
import { CommandPalette, Kbd, isModK, modKeyLabel } from "@/components/shared/command-palette";
import { ScrollTopButton } from "@/components/shared/scroll-top-button";
import { ShortcutsHelp } from "@/components/shared/shortcuts-help";
import { ScrollProgressBar } from "@/components/shared/scroll-progress-bar";
import { ThemeQuickSwitch } from "@/components/shared/theme-quick-switch";
import { AuroraBackground } from "@/components/shared/aurora-background";

interface NavItem {
  id: SectionId;
  label: string;
  /** Optional compact label for the mobile bottom bar (long names get tight at 6 items) */
  short?: string;
  icon: React.ReactNode;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "dashboard", label: T.nav.dashboard, icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "journal", label: T.nav.journal, icon: <BookOpen className="h-5 w-5" /> },
  { id: "practice", label: T.nav.practice, icon: <Sprout className="h-5 w-5" /> },
  { id: "mentorChat", label: "چت منتور", short: "چت", icon: <MessageCircle className="h-5 w-5" /> },
  { id: "mentor", label: T.nav.mentor, short: "منتور", icon: <Bot className="h-5 w-5" /> },
];

const MORE_NAV: NavItem[] = [
  { id: "calendar", label: T.nav.calendar, icon: <CalendarDays className="h-5 w-5" /> },
  { id: "analytics", label: T.nav.analytics, icon: <Grid3x3 className="h-5 w-5" /> },
  { id: "tools", label: "ابزارها", icon: <Wrench className="h-5 w-5" /> },
  { id: "report", label: T.nav.report, icon: <FileText className="h-5 w-5" /> },
  { id: "dailyJournal", label: T.nav.dailyJournal, icon: <BookHeart className="h-5 w-5" /> },
  { id: "backtest", label: T.nav.backtest, icon: <FlaskConical className="h-5 w-5" /> },
  { id: "edgeLab", label: T.nav.edgeLab, icon: <TrendingUp className="h-5 w-5" /> },
  { id: "leakDetector", label: T.nav.leakDetector, icon: <ShieldAlert className="h-5 w-5" /> },
  { id: "propTracker", label: T.nav.propTracker, icon: <Building2 className="h-5 w-5" /> },
  { id: "settings", label: T.nav.settings, icon: <SettingsIcon className="h-5 w-5" /> },
];

const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];

export function AppShell({ children }: { children: React.ReactNode }) {
  useEnsureSeed();
  const { activeSection, setSection, isOnline, theme } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const profiles = useProfiles();

  // global hotkeys: Ctrl/⌘+K toggles the command palette, "/" opens it when
  // not typing (Slack/GitHub convention), "?"/"؟" opens the shortcuts cheatsheet,
  // Alt+1..9 jumps straight to the first 9 sections (nav order) — e.code is
  // layout-independent
  useEffect(() => {
    const typingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return (
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (isModK(e)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      // "/" opens the palette — only when the user isn't typing anywhere and
      // no dialog is open (otherwise "/" must keep its literal meaning)
      if (
        e.key === "/" &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !document.querySelector("[role=dialog]")
      ) {
        if (!typingTarget(e.target)) {
          e.preventDefault();
          setPaletteOpen(true);
        }
      }
      // "?" (latin) / "؟" (persian) opens the keyboard cheatsheet
      if (
        (e.key === "?" || e.key === "؟") &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !document.querySelector("[role=dialog]")
      ) {
        if (!typingTarget(e.target)) {
          e.preventDefault();
          setShortcutsOpen(true);
        }
      }
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        e.code.startsWith("Digit") &&
        e.code.length === 6
      ) {
        const n = Number(e.code.slice(5));
        const item = ALL_NAV[n - 1];
        if (n >= 1 && n <= 9 && item) {
          e.preventDefault();
          setPaletteOpen(false);
          setMoreOpen(false);
          useAppStore.getState().setSection(item.id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ensure a profile is active
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  useEffect(() => {
    if (profiles && profiles.length > 0 && !activeProfileId) {
      setActiveProfile(profiles[0].id);
    }
  }, [profiles, activeProfileId, setActiveProfile]);

  const activeItem = ALL_NAV.find((n) => n.id === activeSection) ?? ALL_NAV[0];

  // keep the browser tab / installed-PWA title in sync with the active section
  useEffect(() => {
    document.title = `${activeItem.label} — ${T.appName}`;
  }, [activeItem]);

  const go = (id: SectionId) => {
    setSection(id);
    setMoreOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isMoreActive = MORE_NAV.some((n) => n.id === activeSection);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Living ambient background — tints with the active theme template */}
      <AuroraBackground />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 glass-strong">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-4">
          {/* Brand — right side in RTL */}
          <button
            onClick={() => go("dashboard")}
            className="flex items-center gap-2.5"
            aria-label={T.appName}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30 neon-glow">
              <svg viewBox="0 0 64 64" className="h-5 w-5" fill="none">
                <path d="M12 40 L22 30 L30 36 L42 20 L52 26" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="52" cy="26" r="3.5" fill="var(--gain)" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight text-gradient-neon">{T.appName}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{T.appTagline}</div>
            </div>
          </button>

          <div className="flex-1" />

          {/* Online status */}
          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:flex",
              isOnline
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-amber-500/30 bg-amber-500/10 text-amber-500"
            )}
            title={isOnline ? T.common.online : T.common.offline}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? T.common.online : T.common.offline}
            <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500 pulse-glow" : "bg-amber-500")} />
          </div>

          {/* Command palette trigger — Ctrl/⌘+K */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-44 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 text-xs text-muted-foreground transition-all hover:border-gold/40 hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-52 sm:flex"
            aria-label={T.palette.searchSections}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate text-right">{T.palette.trigger}</span>
            <span className="flex items-center gap-1" aria-hidden>
              <Kbd>/</Kbd>
              <Kbd>{modKeyLabel()} K</Kbd>
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 sm:hidden"
            onClick={() => setPaletteOpen(true)}
            aria-label={T.palette.searchSections}
          >
            <Search className="h-5 w-5" />
          </Button>

          <ThemeQuickSwitch />

          <ProfileSwitcher />

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => go("settings")}
            aria-label={T.nav.settings}
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Body: sidebar (desktop) + content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop sidebar (right in RTL) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-s border-border/60 p-3 lg:block">
          <nav className="flex flex-col gap-1">
            {ALL_NAV.map((item, i) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className={cn(activeSection === item.id ? "text-accent-foreground" : "")}>
                  {item.icon}
                </span>
                {item.label}
                {/* Alt+N quick-jump hint — fades in on hover */}
                {i < 9 && (
                  <Kbd className="absolute left-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Alt {i + 1}
                  </Kbd>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <p className="font-medium text-foreground">روش LIT</p>
              <p className="mt-1 leading-relaxed">
                لیکوییدیتی ← القا ← BOS/Mitigation ← بایاس تاپ‌دان
              </p>
            </div>
          </div>
        </aside>

        {/* Main content — glassy blur-in entrance on every section switch */}
        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-4 lg:pb-8">
          <div key={activeSection} className="animate-section-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 glass-strong lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                activeSection === item.id ? "text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <span className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                activeSection === item.id ? "bg-accent animate-scale-in" : ""
              )}>
                {item.icon}
              </span>
              {item.short ?? item.label}
            </button>
          ))}
          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  isMoreActive ? "text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isMoreActive ? "bg-accent" : ""
                )}>
                  <MoreHorizontal className="h-5 w-5" />
                </span>
                بیشتر
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="text-right">بخش‌های بیشتر</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 px-1 pb-6 pt-3">
                {MORE_NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
                      activeSection === item.id
                        ? "border-accent bg-accent/50 text-accent-foreground"
                        : "border-border hover:bg-muted/60"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Command palette (Ctrl/⌘+K) */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={go}
        onOpenShortcuts={() => {
          setPaletteOpen(false);
          setShortcutsOpen(true);
        }}
      />

      {/* Keyboard cheatsheet ("?" / "؟") */}
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Floating back-to-top control */}
      <ScrollTopButton />

      {/* Thin gold scroll-progress bar under the header */}
      <ScrollProgressBar />
    </div>
  );
}
