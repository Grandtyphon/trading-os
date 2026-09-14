"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { getThemePreset, effectiveAtmosphere } from "@/lib/themes";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const accentColor = useAppStore((s) => s.accentColor);
  const glassEffect = useAppStore((s) => s.glassEffect);
  const atmosphere = useAppStore((s) => s.atmosphere);
  const lightAtmosphere = useAppStore((s) => s.lightAtmosphere);
  const setOnline = useAppStore((s) => s.setOnline);

  // sync theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  // apply the active atmosphere template (per-mode: dark slot vs light slot) —
  // the [data-atmo] attribute drives the surface/aurora variable blocks in
  // globals.css, which override both the :root light and .dark defaults
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.atmo = effectiveAtmosphere(theme, atmosphere, lightAtmosphere);
  }, [theme, atmosphere, lightAtmosphere]);

  // apply accent color theme preset
  useEffect(() => {
    const root = document.documentElement;
    const preset = getThemePreset(accentColor);
    // apply all CSS variables from preset
    Object.entries(preset.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    // set accent RGB for rgba usage in glass effects
    root.style.setProperty("--accent-rgb", preset.accentRgb);
    root.style.setProperty("--accent-color", preset.accent);
    root.style.setProperty("--accent-color-2", preset.accent2);
  }, [accentColor]);

  // toggle glass effect class
  useEffect(() => {
    const root = document.documentElement;
    if (glassEffect) {
      root.classList.add("glass-enabled");
    } else {
      root.classList.remove("glass-enabled");
    }
  }, [glassEffect]);

  // online/offline status
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOnline]);

  // register service worker for offline PWA + user-controlled update flow:
  // a new SW version installs in the "waiting" state → toast offers
  // "به‌روزرسانی" → SKIP_WAITING → controllerchange → single reload.
  // (No skipWaiting on install anymore — updates never surprise the user.)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let acceptingUpdate = false; // only reload when the user actually accepted

    const offerUpdate = (worker: ServiceWorker) => {
      toast(T.pwa.updateReady, {
        description: T.pwa.updateDesc,
        duration: Infinity,
        action: {
          label: T.pwa.updateAction,
          onClick: () => {
            acceptingUpdate = true;
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // a waiting worker may already exist (update landed while tab was closed)
        if (reg.waiting && navigator.serviceWorker.controller) {
          offerUpdate(reg.waiting);
          return;
        }
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            // "installed" + existing controller ⇒ this is an UPDATE, not first install
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              offerUpdate(next);
            }
          });
        });
      })
      .catch(() => {
        /* SW registration failure is non-fatal */
      });

    const onControllerChange = () => {
      if (acceptingUpdate) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {/* reducedMotion="user" — framer-motion skips transforms/springs when the
          OS-level "reduce motion" preference is set (pairs with the CSS block
          in globals.css so both JS and CSS motion respect the setting) */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
