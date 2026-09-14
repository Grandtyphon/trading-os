"use client";

import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, modKeyLabel } from "@/components/shared/command-palette";
import { Keyboard, Command, Slash, ArrowUpDown, CornerDownLeft, X } from "lucide-react";

interface ShortcutRow {
  keys: React.ReactNode;
  label: string;
  icon: React.ReactNode;
}

/** One-stop keyboard cheatsheet — reachable via "?" / "؟" and the palette actions group. */
export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mod = modKeyLabel();

  const rows: ShortcutRow[] = [
    {
      keys: (
        <>
          <Kbd>{mod} K</Kbd>
        </>
      ),
      label: T.shortcuts.togglePalette,
      icon: <Command className="h-4 w-4" />,
    },
    {
      keys: <Kbd>/</Kbd>,
      label: T.shortcuts.openPalette,
      icon: <Slash className="h-4 w-4" />,
    },
    {
      keys: (
        <>
          <Kbd>Alt</Kbd>
          <Kbd>1–9</Kbd>
        </>
      ),
      label: T.shortcuts.quickJump,
      icon: <Keyboard className="h-4 w-4" />,
    },
    {
      keys: (
        <>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </>
      ),
      label: T.shortcuts.navigate,
      icon: <ArrowUpDown className="h-4 w-4" />,
    },
    {
      keys: <Kbd>↵</Kbd>,
      label: T.shortcuts.select,
      icon: <CornerDownLeft className="h-4 w-4" />,
    },
    {
      keys: <Kbd>Esc</Kbd>,
      label: T.shortcuts.close,
      icon: <X className="h-4 w-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-right">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
              <Keyboard className="h-4 w-4" />
            </span>
            {T.shortcuts.title}
          </DialogTitle>
          <DialogDescription className="text-right">{T.shortcuts.desc}</DialogDescription>
        </DialogHeader>
        <div className="scroll-thin max-h-[55vh] overflow-y-auto py-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="text-muted-foreground">{r.icon}</span>
                {r.label}
              </span>
              <span className="flex shrink-0 items-center gap-1">{r.keys}</span>
            </div>
          ))}
        </div>
        {/* gold neon edge along the bottom — matches the palette footer styling */}
        <div aria-hidden className="h-px w-full bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
        <div className="flex items-center justify-center gap-1.5 border-t border-border/50 px-5 py-2.5 text-[10px] text-muted-foreground">
          <Kbd>?</Kbd>
          <span>یا</span>
          <Kbd>؟</Kbd>
          <span>{T.shortcuts.openHelp}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
