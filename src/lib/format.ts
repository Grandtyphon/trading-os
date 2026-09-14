// Number / price / R formatting utilities.
// IMPORTANT: numbers, prices, R and dates are ALWAYS rendered LTR even inside RTL Persian text.
// Use <Num> component or wrap with dir="ltr" + unicode-bidi isolate.

export function formatR(r: number | null | undefined, digits = 2): string {
  if (r === null || r === undefined || Number.isNaN(r)) return "—";
  const sign = r > 0 ? "+" : "";
  return `${sign}${r.toFixed(digits)}R`;
}

export function formatPrice(n: number | null | undefined, digits?: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  let d = digits;
  if (d === undefined) {
    if (abs >= 1000) d = 2;
    else if (abs >= 100) d = 2;
    else if (abs >= 1) d = 4;
    else d = 5;
  }
  return n.toFixed(d);
}

export function formatPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}٪`;
}

export function formatMoney(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Color helpers for P&L
export function pnlColor(r: number | null | undefined): string {
  if (r === null || r === undefined || Number.isNaN(r)) return "text-muted-foreground";
  if (r > 0.0001) return "text-emerald-500";
  if (r < -0.0001) return "text-rose-500";
  return "text-muted-foreground";
}

export function pnlBg(r: number | null | undefined): string {
  if (r === null || r === undefined || Number.isNaN(r)) return "";
  if (r > 0.0001) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
  if (r < -0.0001) return "bg-rose-500/10 text-rose-500 border-rose-500/30";
  return "bg-muted text-muted-foreground";
}
