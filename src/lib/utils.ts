import { format, parseISO } from "date-fns";

const YEAR_ONLY_RE = /^\d{4}$/;
const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";

  // Year only: "2024"
  if (YEAR_ONLY_RE.test(dateStr)) return dateStr;

  // Year-month: "2024-06"
  if (YEAR_MONTH_RE.test(dateStr)) {
    const [year, month] = dateStr.split("-");
    return format(new Date(Number(year), Number(month) - 1), "MMM yyyy");
  }

  // Full date or datetime
  try {
    const date = parseISO(dateStr);
    if (dateStr.includes("T") || dateStr.includes(" ")) {
      return format(date, "MMM d, yyyy HH:mm");
    }
    return format(date, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "\u2026";
}

export function parseTags(tagsStr: string): string[] {
  if (!tagsStr.trim()) return [];
  return tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
}

export function tagsToString(tags: string[]): string {
  return tags.join(", ");
}
