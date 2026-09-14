"use client";

import { useAppStore } from "@/store/use-app-store";
import { THEME_PRESETS, ATMOSPHERES, getAtmosphere } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Palette, Check, Sparkles, SwatchBook, Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/** A mini "app mockup" preview rendered with the atmosphere's swatch colors —
 *  bg + a glass card + bars + the current accent as a live dot, so the user
 *  sees how their neon accent sits on top of each template. */
function AtmospherePreview({ bg, card, bar }: { bg: string; card: string; bar: string }) {
  return (
    <div className="rounded-xl p-2" style={{ background: bg }}>
      <div className="rounded-lg p-1.5 shadow-sm" style={{ background: card }}>
        <div className="h-1.5 w-9 rounded-full" style={{ background: bar }} />
        <div className="mt-1 h-1 w-14 rounded-full" style={{ background: bar, opacity: 0.55 }} />
        <div className="mt-1.5 flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--gold)", boxShadow: "0 0 6px var(--gold)" }}
          />
          <span className="h-1 flex-1 rounded-full" style={{ background: bar, opacity: 0.4 }} />
        </div>
      </div>
    </div>
  );
}

export function ThemePicker() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const atmosphere = useAppStore((s) => s.atmosphere);
  const lightAtmosphere = useAppStore((s) => s.lightAtmosphere);
  const setAtmosphere = useAppStore((s) => s.setAtmosphere);
  const setLightAtmosphere = useAppStore((s) => s.setLightAtmosphere);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const glassEffect = useAppStore((s) => s.glassEffect);
  const setGlassEffect = useAppStore((s) => s.setGlassEffect);

  const activeAtmo = theme === "dark" ? atmosphere : lightAtmosphere;
  const activeAtmoMeta = getAtmosphere(activeAtmo);

  /** Selecting a template also switches the mode to match it — each slot
   *  (dark/light) remembers its own template, so the classic toggle flips
   *  between "your dark look" and "your light look". */
  const pickAtmosphere = (id: string, mode: "dark" | "light") => {
    if (mode === "dark") {
      setAtmosphere(id);
      setTheme("dark");
    } else {
      setLightAtmosphere(id);
      setTheme("light");
    }
  };

  return (
    <Card className="p-4">
      {/* ===== Atmosphere templates (full-look themes) ===== */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/40 text-accent-foreground">
          <SwatchBook className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">گالری تم</h3>
          <p className="text-[10px] text-muted-foreground">
            قالب کامل ظاهری — پس‌زمینه، کارت‌ها و نور محیطی با هم عوض می‌شن
          </p>
        </div>
        <span
          className={cn(
            "pill border",
            activeAtmoMeta.mode === "dark"
              ? "border-border/60 bg-muted/40 text-muted-foreground"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600"
          )}
          title={activeAtmoMeta.mode === "dark" ? "قالب تیره" : "قالب روشن"}
        >
          {activeAtmoMeta.mode === "dark" ? (
            <Moon className="h-2.5 w-2.5" />
          ) : (
            <Sun className="h-2.5 w-2.5" />
          )}
          {activeAtmoMeta.name}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ATMOSPHERES.map((a) => {
          const isActive = activeAtmo === a.id;
          return (
            <button
              key={a.id}
              onClick={() => pickAtmosphere(a.id, a.mode)}
              className={cn(
                "group relative overflow-hidden rounded-xl border-2 p-1.5 text-right transition-all duration-200",
                isActive
                  ? "scale-[1.02] border-transparent"
                  : "border-border/50 opacity-75 hover:-translate-y-0.5 hover:opacity-100"
              )}
              style={
                isActive
                  ? {
                      borderColor: "var(--gold)",
                      boxShadow: "0 0 14px -4px var(--gold)",
                    }
                  : undefined
              }
              title={a.desc}
            >
              <AtmospherePreview bg={a.preview.bg} card={a.preview.card} bar={a.preview.bar} />
              <div className="flex items-center justify-between gap-1 px-1 pb-0.5 pt-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold leading-tight">{a.name}</p>
                  <p className="truncate text-[8.5px] leading-tight text-muted-foreground" dir="ltr">
                    {a.nameEn}
                  </p>
                </div>
                {isActive ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--gold)" }}>
                    <Check className="h-2.5 w-2.5 text-black" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      a.mode === "dark" ? "bg-muted-foreground/40" : "bg-amber-400/70"
                    )}
                    title={a.mode === "dark" ? "تیره" : "روشن"}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== Neon accent presets ===== */}
      <div className="mb-3 flex items-center gap-2 border-t border-border/40 pt-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/40 text-accent-foreground">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">رنگ‌بندی نئونی</h3>
          <p className="text-[10px] text-muted-foreground">رنگ تاکیدی دکمه‌ها، نمودارها و درخشش‌ها</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEME_PRESETS.map((preset) => {
          const isActive = accentColor === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setAccentColor(preset.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl border-2 p-2.5 transition-all",
                isActive
                  ? "scale-[1.02] border-transparent"
                  : "border-border/60 hover:border-border opacity-80 hover:opacity-100"
              )}
              style={isActive ? {
                borderColor: preset.accent,
                boxShadow: `0 0 12px -2px ${preset.accent}`,
              } : undefined}
            >
              <div
                className="relative h-8 w-8 shrink-0 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${preset.accent}, ${preset.accent2})`,
                  boxShadow: `0 0 8px -1px ${preset.accent}`,
                }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-4 w-4 text-black" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-xs font-bold">{preset.name}</p>
                <p className="truncate text-[9px] text-muted-foreground" dir="ltr">{preset.nameEn}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Glass effect toggle */}
      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-foreground" />
          <div>
            <p className="text-xs font-medium">افکت شیشه‌ای (Liquid Glass)</p>
            <p className="text-[10px] text-muted-foreground">پس‌زمینه‌ی شیشه‌ای با بلور و درخشش نئونی</p>
          </div>
        </div>
        <Switch checked={glassEffect} onCheckedChange={setGlassEffect} />
      </label>

      {/* Live preview */}
      <div className="mt-3 rounded-lg border border-border/60 p-3">
        <p className="mb-2 text-[10px] text-muted-foreground">پیش‌نمایش زنده</p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg p-2 text-center"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${THEME_PRESETS.find(t => t.id === accentColor)?.accent ?? "var(--gold)"} 15%, transparent), transparent)`,
              border: `1px solid color-mix(in oklab, ${THEME_PRESETS.find(t => t.id === accentColor)?.accent ?? "var(--gold)"} 30%, transparent)`,
            }}
          >
            <span
              className="text-sm font-bold neon-text"
              style={{ color: THEME_PRESETS.find(t => t.id === accentColor)?.accent }}
            >
              نمونه‌ی متن نئونی
            </span>
          </div>
          <div
            className="h-10 w-10 rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${THEME_PRESETS.find(t => t.id === accentColor)?.accent}, ${THEME_PRESETS.find(t => t.id === accentColor)?.accent2})`,
              boxShadow: `0 0 12px -1px ${THEME_PRESETS.find(t => t.id === accentColor)?.accent}`,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
