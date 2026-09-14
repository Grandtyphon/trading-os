"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Thin gold progress bar fixed under the header — shows how far the user has
 * scrolled through the current section (right-anchored: RTL reading direction).
 * Fades out at the very top; passive listener; no-op under reduced motion.
 */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        if (scrollable <= 0) {
          setProgress(0);
          return;
        }
        setProgress(Math.min(1, Math.max(0, doc.scrollTop / scrollable)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-16 z-30 h-0.5 bg-transparent print:hidden",
        progress > 0.005 ? "opacity-100" : "opacity-0"
      )}
    >
      {/* right-anchored so the bar grows in the RTL reading direction */}
      <div
        className="absolute inset-y-0 right-0 rounded-l-full bg-gradient-to-l from-gold/80 via-gold/50 to-gold/20 shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_35%,transparent)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="sr-only">{T.shortcuts.scroll}</span>
    </div>
  );
}
