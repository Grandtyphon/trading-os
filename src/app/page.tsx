"use client";

import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/store/use-app-store";
import { JournalSection } from "@/components/sections/journal";
import { DashboardSection } from "@/components/sections/dashboard";
import { CalendarSection } from "@/components/sections/calendar";
import { DailyJournalSection } from "@/components/sections/daily-journal";
import { AnalyticsSection } from "@/components/sections/analytics";
import { ReportSection } from "@/components/sections/report";
import { BacktestSection } from "@/components/sections/backtest";
import { EdgeLabSection } from "@/components/sections/edge-lab";
import { LeakDetectorSection } from "@/components/sections/leak-detector";
import { PropTrackerSection } from "@/components/sections/prop-tracker";
import { MentorSection } from "@/components/sections/mentor";
import { MentorChat } from "@/components/sections/mentor-chat";
import { ToolsSection } from "@/components/sections/tools";
import { SettingsSection } from "@/components/sections/settings";
import { PracticeSection } from "@/components/sections/practice";

export default function Home() {
  const section = useAppStore((s) => s.activeSection);

  return (
    <AppShell>
      {section === "dashboard" && <DashboardSection />}
      {section === "journal" && <JournalSection />}
      {section === "calendar" && <CalendarSection />}
      {section === "dailyJournal" && <DailyJournalSection />}
      {section === "analytics" && <AnalyticsSection />}
      {section === "report" && <ReportSection />}
      {section === "backtest" && <BacktestSection />}
      {section === "edgeLab" && <EdgeLabSection />}
      {section === "leakDetector" && <LeakDetectorSection />}
      {section === "propTracker" && <PropTrackerSection />}
      {section === "practice" && <PracticeSection />}
      {section === "mentor" && <MentorSection />}
      {section === "mentorChat" && <MentorChat />}
      {section === "tools" && <ToolsSection />}
      {section === "settings" && <SettingsSection />}
    </AppShell>
  );
}
