import moment from "jalali-moment";

// jalali-moment extends moment. All internal storage uses epoch ms (gregorian/ISO).
// Display layer converts to either Jalali or Gregorian strings.

export type CalendarMode = "jalali" | "gregorian";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// Format a timestamp into a date string for the chosen calendar.
// Always returns digits as latin unless persianDigits=true (handled by caller for isolation).
export function formatDate(ts: number, mode: CalendarMode, opts?: { withTime?: boolean; persianDigits?: boolean }): string {
  const m = moment(ts);
  let str: string;
  if (mode === "jalali") {
    const fmt = opts?.withTime ? "jYYYY/jMM/jDD — HH:mm" : "jYYYY/jMM/jDD";
    str = m.format(fmt);
    // Jalali month name (Persian)
    if (!opts?.withTime) {
      str = m.format("jD jMMMM jYYYY");
    } else {
      str = m.format("jD jMMMM jYYYY — HH:mm");
    }
  } else {
    str = opts?.withTime
      ? m.format("D MMMM YYYY — HH:mm")
      : m.format("D MMMM YYYY");
  }
  return opts?.persianDigits ? toPersianDigits(str) : str;
}

export function formatDateShort(ts: number, mode: CalendarMode, persianDigits?: boolean): string {
  const m = moment(ts);
  const str = mode === "jalali" ? m.format("jYY/jMM/jDD") : m.format("YY/MM/DD");
  return persianDigits ? toPersianDigits(str) : str;
}

export function formatTime(ts: number, persianDigits?: boolean): string {
  const str = moment(ts).format("HH:mm");
  return persianDigits ? toPersianDigits(str) : str;
}

// Relative time in Persian
export function formatRelative(ts: number, mode: CalendarMode, persianDigits?: boolean): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  let str: string;
  if (min < 1) str = "همین حالا";
  else if (min < 60) str = `${min} دقیقه پیش`;
  else if (hr < 24) str = `${hr} ساعت پیش`;
  else if (day < 7) str = `${day} روز پیش`;
  else return formatDateShort(ts, mode, persianDigits);
  return persianDigits ? toPersianDigits(str) : str;
}

// Parse a Jalali date string (jYYYY/jMM/jDD) or Gregorian (YYYY-MM-DD) into epoch ms.
export function parseDateInput(value: string, mode: CalendarMode): number | null {
  if (!value) return null;
  try {
    if (mode === "jalali") {
      // value like 1403/05/12
      const m = moment(value, "jYYYY/jMM/jDD");
      if (m.isValid()) return m.valueOf();
    }
    const m = moment(value, ["YYYY-MM-DD", "YYYY/MM/DD"]);
    if (m.isValid()) return m.valueOf();
  } catch {
    /* ignore */
  }
  return null;
}

// Build an input value for a date input based on calendar mode.
export function toDateInputValue(ts: number, mode: CalendarMode): string {
  const m = moment(ts);
  return mode === "jalali" ? m.format("jYYYY/jMM/jDD") : m.format("YYYY-MM-DD");
}

export function toDateTimeInputValue(ts: number, mode: CalendarMode): string {
  const m = moment(ts);
  return mode === "jalali"
    ? m.format("jYYYY/jMM/jDD HH:mm")
    : m.format("YYYY-MM-DDTHH:mm");
}

// Convert ms to datetime-local input value (gregorian, native input)
export function toNativeDateTimeValue(ts: number): string {
  const d = new Date(ts);
  const off = d.getTimezoneOffset();
  const local = new Date(ts - off * 60000);
  return local.toISOString().slice(0, 16);
}

// Get current Jalali year/month for defaults
export function jalaliMonthLabel(ts: number, persianDigits?: boolean): string {
  const str = moment(ts).format("jMMMM jYYYY");
  return persianDigits ? toPersianDigits(str) : str;
}
