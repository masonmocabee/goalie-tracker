import { GOAL_DETAIL_LABELS, type GoalDetail } from '../types';

/** Today's date as YYYY-MM-DD in local time. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-09-30" -> "Wed, Sep 30" (parsed as a local date, not UTC). */
export function formatGameDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "2026-09-13" -> "Sep 13" */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "2026-09-30" -> { mon: "SEP", day: "30" } for the date tile on game rows. */
export function dateTile(iso: string): { mon: string; day: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const mon = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  return { mon, day: String(d).padStart(2, '0') };
}

/** Hockey season label, e.g. "2026–27". Seasons start in August. */
export function seasonLabel(today: string): string {
  const [y, m] = today.split('-').map(Number);
  const start = m >= 8 ? y : y - 1;
  return `${start}–${String(start + 1).slice(2)}`;
}

/** GAA with two decimals, or a dash. */
export function formatGaa(gaa: number | null): string {
  return gaa === null ? '—' : gaa.toFixed(2);
}

/** Tidy a typed game clock: "1234" -> "12:34", "905" -> "9:05". Other input is kept as typed. */
export function normalizeClock(raw: string): string {
  const s = raw.trim();
  if (/^\d{3,4}$/.test(s)) return `${Number(s.slice(0, -2))}:${s.slice(-2)}`;
  return s;
}

/** ["screen", "deflection"] -> "Screen + Deflection" */
export function detailsLabel(details: GoalDetail[] | undefined): string | undefined {
  return details?.length ? details.map((d) => GOAL_DETAIL_LABELS[d]).join(' + ') : undefined;
}
