// Neon theme presets — each defines accent color, glow, and gradient.
// Applied via CSS custom properties on :root.

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  // Primary accent (neon color)
  accent: string;       // oklch or hex
  accentRgb: string;    // "r, g, b" for rgba usage
  // Secondary accent for gradients
  accent2: string;
  // CSS variable values
  vars: {
    "--primary": string;
    "--ring": string;
    "--gold": string;
    "--sidebar-primary": string;
    "--sidebar-accent": string;
    "--sidebar-ring": string;
    "--chart-3": string;
    "--chart-5": string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "gold",
    name: "طلایی",
    nameEn: "Gold",
    accent: "#e8b65a",
    accent2: "#f0c870",
    accentRgb: "232, 182, 90",
    vars: {
      "--primary": "oklch(0.78 0.14 75)",
      "--ring": "oklch(0.78 0.14 75)",
      "--gold": "oklch(0.8 0.14 75)",
      "--sidebar-primary": "oklch(0.78 0.14 75)",
      "--sidebar-accent": "oklch(0.3 0.025 75)",
      "--sidebar-ring": "oklch(0.78 0.14 75)",
      "--chart-3": "oklch(0.8 0.14 75)",
      "--chart-5": "oklch(0.72 0.13 70)",
    },
  },
  {
    id: "emerald",
    name: "نبض زمردی",
    nameEn: "Neon Emerald",
    accent: "#10f5a0",
    accent2: "#00d4ff",
    accentRgb: "16, 245, 160",
    vars: {
      "--primary": "oklch(0.78 0.19 160)",
      "--ring": "oklch(0.78 0.19 160)",
      "--gold": "oklch(0.82 0.20 165)",
      "--sidebar-primary": "oklch(0.78 0.19 160)",
      "--sidebar-accent": "oklch(0.3 0.03 160)",
      "--sidebar-ring": "oklch(0.78 0.19 160)",
      "--chart-3": "oklch(0.82 0.20 165)",
      "--chart-5": "oklch(0.72 0.18 155)",
    },
  },
  {
    id: "magenta",
    name: "سرخابی نئونی",
    nameEn: "Neon Magenta",
    accent: "#ff10f5",
    accent2: "#a020f0",
    accentRgb: "255, 16, 245",
    vars: {
      "--primary": "oklch(0.72 0.28 330)",
      "--ring": "oklch(0.72 0.28 330)",
      "--gold": "oklch(0.75 0.25 335)",
      "--sidebar-primary": "oklch(0.72 0.28 330)",
      "--sidebar-accent": "oklch(0.3 0.04 330)",
      "--sidebar-ring": "oklch(0.72 0.28 330)",
      "--chart-3": "oklch(0.75 0.25 335)",
      "--chart-5": "oklch(0.68 0.26 320)",
    },
  },
  {
    id: "cyan",
    name: "فیروزه‌ای نئونی",
    nameEn: "Neon Cyan",
    accent: "#00f0ff",
    accent2: "#0080ff",
    accentRgb: "0, 240, 255",
    vars: {
      "--primary": "oklch(0.80 0.16 200)",
      "--ring": "oklch(0.80 0.16 200)",
      "--gold": "oklch(0.82 0.15 195)",
      "--sidebar-primary": "oklch(0.80 0.16 200)",
      "--sidebar-accent": "oklch(0.3 0.03 200)",
      "--sidebar-ring": "oklch(0.80 0.16 200)",
      "--chart-3": "oklch(0.82 0.15 195)",
      "--chart-5": "oklch(0.72 0.14 210)",
    },
  },
  {
    id: "violet",
    name: "بنفش نئونی",
    nameEn: "Neon Violet",
    accent: "#a855f7",
    accent2: "#6366f1",
    accentRgb: "168, 85, 247",
    vars: {
      "--primary": "oklch(0.72 0.22 295)",
      "--ring": "oklch(0.72 0.22 295)",
      "--gold": "oklch(0.75 0.20 300)",
      "--sidebar-primary": "oklch(0.72 0.22 295)",
      "--sidebar-accent": "oklch(0.3 0.04 295)",
      "--sidebar-ring": "oklch(0.72 0.22 295)",
      "--chart-3": "oklch(0.75 0.20 300)",
      "--chart-5": "oklch(0.68 0.21 285)",
    },
  },
  {
    id: "coral",
    name: "مرجانی نئونی",
    nameEn: "Neon Coral",
    accent: "#ff6b6b",
    accent2: "#ff9a56",
    accentRgb: "255, 107, 107",
    vars: {
      "--primary": "oklch(0.74 0.20 25)",
      "--ring": "oklch(0.74 0.20 25)",
      "--gold": "oklch(0.76 0.18 35)",
      "--sidebar-primary": "oklch(0.74 0.20 25)",
      "--sidebar-accent": "oklch(0.3 0.03 25)",
      "--sidebar-ring": "oklch(0.74 0.20 25)",
      "--chart-3": "oklch(0.76 0.18 35)",
      "--chart-5": "oklch(0.70 0.19 15)",
    },
  },
  {
    id: "lime",
    name: "لیمویی نئونی",
    nameEn: "Neon Lime",
    accent: "#a3ff12",
    accent2: "#00ff88",
    accentRgb: "163, 255, 18",
    vars: {
      "--primary": "oklch(0.84 0.20 125)",
      "--ring": "oklch(0.84 0.20 125)",
      "--gold": "oklch(0.85 0.18 130)",
      "--sidebar-primary": "oklch(0.84 0.20 125)",
      "--sidebar-accent": "oklch(0.3 0.03 125)",
      "--sidebar-ring": "oklch(0.84 0.20 125)",
      "--chart-3": "oklch(0.85 0.18 130)",
      "--chart-5": "oklch(0.78 0.19 115)",
    },
  },
  {
    id: "rose",
    name: "غنچه‌ای نئونی",
    nameEn: "Neon Rose",
    accent: "#ff1493",
    accent2: "#ff69b4",
    accentRgb: "255, 20, 147",
    vars: {
      "--primary": "oklch(0.72 0.24 350)",
      "--ring": "oklch(0.72 0.24 350)",
      "--gold": "oklch(0.75 0.22 355)",
      "--sidebar-primary": "oklch(0.72 0.24 350)",
      "--sidebar-accent": "oklch(0.3 0.04 350)",
      "--sidebar-ring": "oklch(0.72 0.24 350)",
      "--chart-3": "oklch(0.75 0.22 355)",
      "--chart-5": "oklch(0.68 0.23 340)",
    },
  },
  {
    id: "amber",
    name: "کهربایی نئونی",
    nameEn: "Neon Amber",
    accent: "#ffaa00",
    accent2: "#ff6600",
    accentRgb: "255, 170, 0",
    vars: {
      "--primary": "oklch(0.78 0.18 65)",
      "--ring": "oklch(0.78 0.18 65)",
      "--gold": "oklch(0.80 0.16 70)",
      "--sidebar-primary": "oklch(0.78 0.18 65)",
      "--sidebar-accent": "oklch(0.3 0.03 65)",
      "--sidebar-ring": "oklch(0.78 0.18 65)",
      "--chart-3": "oklch(0.80 0.16 70)",
      "--chart-5": "oklch(0.72 0.17 55)",
    },
  },
  {
    id: "sky",
    name: "آسمانی نئونی",
    nameEn: "Neon Sky",
    accent: "#38bdf8",
    accent2: "#818cf8",
    accentRgb: "56, 189, 248",
    vars: {
      "--primary": "oklch(0.74 0.15 235)",
      "--ring": "oklch(0.74 0.15 235)",
      "--gold": "oklch(0.78 0.13 240)",
      "--sidebar-primary": "oklch(0.74 0.15 235)",
      "--sidebar-accent": "oklch(0.3 0.03 235)",
      "--sidebar-ring": "oklch(0.74 0.15 235)",
      "--chart-3": "oklch(0.78 0.13 240)",
      "--chart-5": "oklch(0.70 0.14 225)",
    },
  },
];

export function getThemePreset(id: string): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

// ---------------------------------------------------------------------------
// Atmosphere templates — full-look themes (background + surfaces + aurora).
// Each template carries a fixed mode (dark/light). The active one is stored as
// `atmosphere` (dark slot) / `lightAtmosphere` (light slot) in the app store and
// applied to <html data-atmo="…"> — the actual CSS variable overrides live in
// globals.css ([data-atmo] blocks). This metadata drives the theme gallery
// previews and the quick-switcher.
// ---------------------------------------------------------------------------

export interface Atmosphere {
  id: string;
  name: string;
  nameEn: string;
  mode: "dark" | "light";
  desc: string; // short Persian vibe line for the gallery
  /** Approximate swatch colors (decorative previews only) */
  preview: { bg: string; card: string; bar: string };
}

export const ATMOSPHERES: Atmosphere[] = [
  {
    id: "midnight",
    name: "نیمه‌شب",
    nameEn: "Midnight",
    mode: "dark",
    desc: "فضای عمیق شب با ستاره‌های نئون",
    preview: { bg: "#0b0e15", card: "#151a26", bar: "#232b3d" },
  },
  {
    id: "nebula",
    name: "سحابی",
    nameEn: "Nebula",
    mode: "dark",
    desc: "کهکشان بنفش با غبار درخشان",
    preview: { bg: "#140f22", card: "#1d1635", bar: "#2c2150" },
  },
  {
    id: "ocean",
    name: "اقیانوس",
    nameEn: "Ocean",
    mode: "dark",
    desc: "اعماق آرام آب‌های فیروزه‌ای",
    preview: { bg: "#081217", card: "#0e2029", bar: "#153039" },
  },
  {
    id: "ember",
    name: "اخگر",
    nameEn: "Ember",
    mode: "dark",
    desc: "گرمای اخگر و شراب تیره",
    preview: { bg: "#180e0b", card: "#221310", bar: "#38201a" },
  },
  {
    id: "forest",
    name: "جنگل شب",
    nameEn: "Night Forest",
    mode: "dark",
    desc: "سبز عمیق و نفس‌های جنگل",
    preview: { bg: "#071109", card: "#0d2118", bar: "#123324" },
  },
  {
    id: "dawn",
    name: "طلوع",
    nameEn: "Dawn",
    mode: "light",
    desc: "روشنِ گرم مثل طلوع آفتاب",
    preview: { bg: "#fbf5e9", card: "#fffdf8", bar: "#f1e7d2" },
  },
  {
    id: "mist",
    name: "مه صبحگاهی",
    nameEn: "Morning Mist",
    mode: "light",
    desc: "روشنِ خنک با مه صبحگاهی",
    preview: { bg: "#f3f6f8", card: "#ffffff", bar: "#e2e9ee" },
  },
  {
    id: "blush",
    name: "شکوفه",
    nameEn: "Blossom",
    mode: "light",
    desc: "روشنِ گلبهی مثل شکوفه‌ی بهار",
    preview: { bg: "#fbebe9", card: "#fff8f7", bar: "#f5d9d6" },
  },
];

export function getAtmosphere(id: string): Atmosphere {
  return ATMOSPHERES.find((a) => a.id === id) ?? ATMOSPHERES[0];
}

/** Next atmosphere in gallery order — powers the «تم بعدی» palette command. */
export function nextAtmosphere(id: string): Atmosphere {
  const i = ATMOSPHERES.findIndex((a) => a.id === id);
  return ATMOSPHERES[(i + 1 + ATMOSPHERES.length) % ATMOSPHERES.length];
}

/** The atmosphere actually in effect for the current mode. */
export function effectiveAtmosphere(
  theme: "dark" | "light",
  darkAtmo: string,
  lightAtmo: string
): string {
  return theme === "dark" ? darkAtmo : lightAtmo;
}
