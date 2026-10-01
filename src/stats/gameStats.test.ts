import { describe, expect, it } from 'vitest';
import type { ShotEvent } from '../types';
import { formatSvPct, needsDetails, periodTotals, totals } from './gameStats';

function ev(partial: Partial<ShotEvent>): ShotEvent {
  return {
    id: crypto.randomUUID(),
    gameId: 'g1',
    type: 'save',
    period: 1,
    sortKey: 1000,
    highDanger: false,
    createdAt: '',
    updatedAt: '',
    deleted: false,
    ...partial,
  };
}

describe('totals', () => {
  it('returns null SV% with no shots', () => {
    expect(totals([])).toEqual({ shots: 0, saves: 0, goals: 0, svPct: null });
  });

  it('counts saves and goals and ignores deleted events', () => {
    const events = [
      ev({ type: 'save' }),
      ev({ type: 'save' }),
      ev({ type: 'save' }),
      ev({ type: 'goal' }),
      ev({ type: 'goal', deleted: true }),
    ];
    expect(totals(events)).toEqual({ shots: 4, saves: 3, goals: 1, svPct: 0.75 });
  });

  it('filters by period', () => {
    const events = [ev({ period: 1 }), ev({ period: 2, type: 'goal' }), ev({ period: 'OT' })];
    expect(periodTotals(events, 2)).toEqual({ shots: 1, saves: 0, goals: 1, svPct: 0 });
    expect(periodTotals(events, 'OT').shots).toBe(1);
  });
});

describe('needsDetails', () => {
  it('flags goals missing zone or reason', () => {
    expect(needsDetails(ev({ type: 'goal' }))).toBe(true);
    expect(needsDetails(ev({ type: 'goal', netZone: 'five_hole' }))).toBe(true);
    expect(needsDetails(ev({ type: 'goal', netZone: 'five_hole', reason: 'screen' }))).toBe(false);
  });

  it('never flags saves or deleted goals', () => {
    expect(needsDetails(ev({ type: 'save' }))).toBe(false);
    expect(needsDetails(ev({ type: 'goal', deleted: true }))).toBe(false);
  });
});

describe('formatSvPct', () => {
  it('formats hockey style', () => {
    expect(formatSvPct(null)).toBe('—');
    expect(formatSvPct(0.9166)).toBe('.917');
    expect(formatSvPct(1)).toBe('1.000');
    expect(formatSvPct(0)).toBe('.000');
  });
});
