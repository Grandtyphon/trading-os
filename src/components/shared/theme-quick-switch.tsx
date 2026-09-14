"use client";

import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { THEME_PRESETS, ATMOSPHERES, getAtmosphere } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Check, Moon, Sun, SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Header quick theme switch — change the whole look (atmosphere template +
 * neon accent) from anywhere, without a trip to Settings.
 * Controlled popover: picking any option applies it instantly and closes,
 * so the user immediately sees the new look behind the fading overlay.
 */
export function ThemeQuickSwitch() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const atmosphere = useAppStore((s) => s.atmosphere);
  const lightAtmosphere = useAppStore((s) => s.lightAtmosphere);
  const setAtmosphere = useAppStore((s) => s.setAtmosphere);
  const setLightAtmosphere = useAppStore((s) => s.setLightAtmosphere);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const [open, setOpen] = useState(false);

  const activeAtmo = theme === "dark" ? atmosphere : lightAtmosphere;
  const activeMeta = getAtmosphere(activeAtmo);

  const pickAtmosphere = (id: string, mode: "dark" | "light") => {
    if (mode === "dark") {
      setAtmosphere(id);
      setTheme("dark");
    } else {
      setLightAtmosphere(id);
      setTheme("light");
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="قالب ظاهری"
          title="قالب ظاهری"
        >
          <SwatchBook className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        {/* Current look line */}
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/40 text-accent-foreground">
            <SwatchBook className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-tight">قالب ظاهری</p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              {activeMeta.name} ·{" "}
              {theme === "dark" ? (
                <Moon className="inline h-2.5 w-2.5 align-[-2px]" />
              ) : (
                <Sun className="inline h-2.5 w-2.5 align-[-2px]" />
              )}{" "}
              {theme === "dark" ? "تیره" : "روشن"}
            </p>
          </div>
        </div>

        {/* Atmosphere grid — compact previews */}
        <div className="grid grid-cols-2 gap-1.5">
          {ATMOSPHERES.map((a) => {
            const isActive = activeAtmo === a.id;
            return (
              <button
                key={a.id}
                onClick={() => pickAtmosphere(a.id, a.mode)}
                className={cn(
                  "group relative flex items-center gap-2 overflow-hidden rounded-lg border p-1.5 text-right transition-all",
                  isActive
                    ? "border-transparent shadow-[0_0_10px_-3px_var(--gold)]"
                    : "border-border/60 hover:bg-muted/50"
                )}
                style={isActive ? { borderColor: "var(--gold)" } : undefined}
                title={a.desc}
              >
                <span
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: `linear-gradient(135deg, ${a.preview.bg}, ${a.preview.bar})`,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                  }}
                >
                  {a.mode === "dark" ? (
                    <Moon className="h-3 w-3" style={{ color: a.preview.bar }} />
                  ) : (
                    <Sun className="h-3 w-3" style={{ color: a.preview.bar }} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold leading-tight">{a.name}</span>
                  <span className="block truncate text-[8.5px] leading-tight text-muted-foreground" dir="ltr">
                    {a.nameEn}
                  </span>
                </span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gold)" }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Accent dots */}
        <div className="mt-3 border-t border-border/50 pt-2.5">
          <p className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground">رنگ نئونی</p>
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {THEME_PRESETS.map((p) => {
              const isActive = accentColor === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setAccentColor(p.id)}
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110",
                    isActive && "scale-110"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
                    boxShadow: isActive ? `0 0 10px -1px ${p.accent}` : "inset 0 0 0 1px rgba(255,255,255,0.15)",
                  }}
                  title={p.name}
                  aria-label={p.name}
                >
                  {isActive && <Check className="h-3 w-3 text-black" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
