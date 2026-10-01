import type { Period, ShotEvent } from '../types';

/** All periods available for a game: 1..numPeriods plus OT. */
export function periodsFor(numPeriods: number): Period[] {
  const periods: Period[] = [];
  for (let p = 1; p <= numPeriods; p++) periods.push(p);
  periods.push('OT');
  return periods;
}

function periodRank(p: Period): number {
  return p === 'OT' ? Number.MAX_SAFE_INTEGER : p;
}

export function comparePeriod(a: Period, b: Period): number {
  return periodRank(a) - periodRank(b);
}

/** Order events by period, then sortKey. Returns a new array. */
export function sortEvents(events: ShotEvent[]): ShotEvent[] {
  return [...events].sort(
    (a, b) => comparePeriod(a.period, b.period) || a.sortKey - b.sortKey,
  );
}

export function periodLabel(p: Period): string {
  return p === 'OT' ? 'OT' : `P${p}`;
}

export function periodName(p: Period): string {
  return p === 'OT' ? 'Overtime' : `Period ${p}`;
}
