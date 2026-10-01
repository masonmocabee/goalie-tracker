import type { Period, ShotEvent } from '../types';

export interface ShotTotals {
  shots: number;
  saves: number;
  goals: number;
  /** Save percentage as a fraction 0..1, or null when there are no shots. */
  svPct: number | null;
}

export function totals(events: ShotEvent[]): ShotTotals {
  let saves = 0;
  let goals = 0;
  for (const e of events) {
    if (e.deleted) continue;
    if (e.type === 'save') saves++;
    else goals++;
  }
  const shots = saves + goals;
  return { shots, saves, goals, svPct: shots ? saves / shots : null };
}

export function periodTotals(events: ShotEvent[], period: Period): ShotTotals {
  return totals(events.filter((e) => e.period === period));
}

export function highDangerTotals(events: ShotEvent[]): ShotTotals {
  return totals(events.filter((e) => e.highDanger));
}

/** The most recently logged event (by when it was logged, not timeline order). */
export function lastLogged(events: ShotEvent[]): ShotEvent | undefined {
  let latest: ShotEvent | undefined;
  for (const e of events) {
    if (!e.deleted && (!latest || e.createdAt >= latest.createdAt)) latest = e;
  }
  return latest;
}

/** A goal needs details when its net zone or reason hasn't been filled in. */
export function needsDetails(e: ShotEvent): boolean {
  return e.type === 'goal' && !e.deleted && (!e.netZone || !e.reason);
}

/** Hockey-style save percentage, e.g. ".917". */
export function formatSvPct(svPct: number | null): string {
  if (svPct === null) return '—';
  if (svPct === 1) return '1.000';
  return svPct.toFixed(3).replace(/^0/, '');
}
