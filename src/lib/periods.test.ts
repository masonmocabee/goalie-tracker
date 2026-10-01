import { describe, expect, it } from 'vitest';
import type { ShotEvent } from '../types';
import { periodsFor, sortEvents } from './periods';

describe('periodsFor', () => {
  it('lists regulation periods then OT', () => {
    expect(periodsFor(3)).toEqual([1, 2, 3, 'OT']);
    expect(periodsFor(2)).toEqual([1, 2, 'OT']);
  });
});

describe('sortEvents', () => {
  it('orders by period (OT last) then sortKey', () => {
    const mk = (id: string, period: ShotEvent['period'], sortKey: number) =>
      ({ id, period, sortKey }) as ShotEvent;
    const sorted = sortEvents([
      mk('ot', 'OT', 1000),
      mk('p2', 2, 1000),
      mk('p1b', 1, 2000),
      mk('p1a', 1, 1500),
      mk('p3', 3, 500),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['p1a', 'p1b', 'p2', 'p3', 'ot']);
  });
});
