"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProfileType } from "@/lib/types";
import type { CalendarMode } from "@/lib/calendar";

export type SectionId =
  | "dashboard"
  | "journal"
  | "calendar"
  | "dailyJournal"
  | "analytics"
  | "report"
  | "mentor"
  | "mentorChat"
  | "tools"
  | "backtest"
  | "edgeLab"
  | "leakDetector"
  | "propTracker"
  | "practice"
  | "settings";

export type DateRangePreset = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

export interface TradingGoal {
  monthlyTargetR: number;     // target net R per month
  dailyMaxTrades: number;     // max trades per day (0 = no limit)
  maxRiskPerTrade: number;    // max risk % per trade
  weeklyMinTrades: number;    // minimum trades per week for consistency
}

interface AppState {
  activeSection: SectionId;
  recentSections: SectionId[]; // most-recent-first, capped — feeds the palette "اخیراً" group
  recentSectionsAt: Record<string, number>; // sectionId → last-visit ts (palette relative badges)
  celebratedMilestones: string[]; // `${profileId}:${milestone}` — practice streak toasts shown once
  habitsSeededProfiles: string[]; // profileIds that already got their default habits seeded
  lastBackupAt: number | null; // ts of the last full JSON export (settings backup freshness)
  activeProfileId: string | null;
  profileFilter: "all" | string;
  theme: "dark" | "light";
  atmosphere: string; // dark-mode atmosphere template id (midnight, nebula, …)
  lightAtmosphere: string; // light-mode atmosphere template id (dawn, mist, …)
  accentColor: string; // theme preset id (gold, emerald, magenta, etc.)
  glassEffect: boolean; // enable/disable liquid glass styling
  calendarMode: CalendarMode;
  persianDigits: boolean;
  isOnline: boolean;
  mentorRange: "last10" | "last30" | "all";
  dateRangePreset: DateRangePreset;
  dateRangeStart: number | null;
  dateRangeEnd: number | null;
  goal: TradingGoal;
  setSection: (s: SectionId) => void;
  setActiveProfile: (id: string | null) => void;
  setProfileFilter: (f: "all" | string) => void;
  setTheme: (t: "dark" | "light") => void;
  setAtmosphere: (a: string) => void;
  setLightAtmosphere: (a: string) => void;
  setAccentColor: (c: string) => void;
  setGlassEffect: (g: boolean) => void;
  setCalendarMode: (m: CalendarMode) => void;
  setPersianDigits: (p: boolean) => void;
  setOnline: (o: boolean) => void;
  setMentorRange: (r: "last10" | "last30" | "all") => void;
  setDateRangePreset: (p: DateRangePreset) => void;
  setDateRange: (start: number | null, end: number | null) => void;
  setGoal: (g: Partial<TradingGoal>) => void;
  markMilestone: (key: string) => void;
  markHabitsSeeded: (profileId: string) => void;
  markBackupDone: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeSection: "dashboard",
      recentSections: [],
      recentSectionsAt: {},
      celebratedMilestones: [],
      habitsSeededProfiles: [],
      lastBackupAt: null,
      activeProfileId: null,
      profileFilter: "all",
      theme: "dark",
      atmosphere: "midnight",
      lightAtmosphere: "dawn",
      accentColor: "gold",
      glassEffect: true,
      calendarMode: "jalali",
      persianDigits: false,
      isOnline: true,
      mentorRange: "last30",
      dateRangePreset: "all",
      dateRangeStart: null,
      dateRangeEnd: null,
      goal: {
        monthlyTargetR: 20,
        dailyMaxTrades: 5,
        maxRiskPerTrade: 2,
        weeklyMinTrades: 5,
      },
      // every navigation (nav, palette, quick-actions, Alt+N…) records the section
      // as recently used: move-to-front + dedupe + cap at 4 entries + timestamp
      setSection: (activeSection) =>
        set((s) => ({
          activeSection,
          recentSections: [
            activeSection,
            ...s.recentSections.filter((x) => x !== activeSection),
          ].slice(0, 4),
          recentSectionsAt: {
            ...s.recentSectionsAt,
            [activeSection]: Date.now(),
          },
        })),
      setActiveProfile: (activeProfileId) => set({ activeProfileId }),
      setProfileFilter: (profileFilter) => set({ profileFilter }),
      setTheme: (theme) => set({ theme }),
      setAtmosphere: (atmosphere) => set({ atmosphere }),
      setLightAtmosphere: (lightAtmosphere) => set({ lightAtmosphere }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setGlassEffect: (glassEffect) => set({ glassEffect }),
      setCalendarMode: (calendarMode) => set({ calendarMode }),
      setPersianDigits: (persianDigits) => set({ persianDigits }),
      setOnline: (isOnline) => set({ isOnline }),
      setMentorRange: (mentorRange) => set({ mentorRange }),
      setDateRangePreset: (dateRangePreset) =>
        set((s) => {
          if (dateRangePreset === "custom") return { dateRangePreset };
          return { dateRangePreset, dateRangeStart: null, dateRangeEnd: null };
        }),
      setDateRange: (dateRangeStart, dateRangeEnd) =>
        set({ dateRangeStart, dateRangeEnd, dateRangePreset: "custom" }),
      setGoal: (g) => set((s) => ({ goal: { ...s.goal, ...g } })),
      // idempotent — guards double-fire of the same streak celebration
      markMilestone: (key) =>
        set((s) => ({
          celebratedMilestones: s.celebratedMilestones.includes(key)
            ? s.celebratedMilestones
            : [...s.celebratedMilestones, key],
        })),
      // one-time default-habit seeding per profile (idempotent)
      markHabitsSeeded: (profileId) =>
        set((s) => ({
          habitsSeededProfiles: s.habitsSeededProfiles.includes(profileId)
            ? s.habitsSeededProfiles
            : [...s.habitsSeededProfiles, profileId],
        })),
      // called whenever a full JSON backup is downloaded
      markBackupDone: () => set({ lastBackupAt: Date.now() }),
    }),
    {
      name: "trading-os-ui",
      partialize: (s) => ({
        activeSection: s.activeSection,
        recentSections: s.recentSections,
        recentSectionsAt: s.recentSectionsAt,
        celebratedMilestones: s.celebratedMilestones,
        habitsSeededProfiles: s.habitsSeededProfiles,
        lastBackupAt: s.lastBackupAt,
        activeProfileId: s.activeProfileId,
        profileFilter: s.profileFilter,
        theme: s.theme,
        atmosphere: s.atmosphere,
        lightAtmosphere: s.lightAtmosphere,
        accentColor: s.accentColor,
        glassEffect: s.glassEffect,
        calendarMode: s.calendarMode,
        persianDigits: s.persianDigits,
        mentorRange: s.mentorRange,
        dateRangePreset: s.dateRangePreset,
        goal: s.goal,
      }),
    }
  )
);

export function profileTypeForSection(section: SectionId): ProfileType | "any" {
  if (section === "backtest") return "backtest";
  return "any";
}
