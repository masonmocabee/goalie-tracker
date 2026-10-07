import { describe, expect, it } from 'vitest';
import type { ShotEvent } from '../types';
import { migrateEvent } from './migrate';

const T = '2026-10-01T10:00:00.000Z';

function goal(over: Record<string, unknown> = {}): ShotEvent {
  return { id: 'e1', gameId: 'g1', type: 'goal', period: 1, sortKey: 1000, highDanger: false, createdAt: T, updatedAt: T, deleted: false, ...over } as ShotEvent;
}

describe('migrateEvent', () => {
  it('moves old reasons that are now details', () => {
    for (const old of ['screen', 'rebound', 'deflection', 'breakaway', 'odd_man_rush', 'cross_crease', 'wraparound', 'bad_angle']) {
      const e = migrateEvent(goal({ reason: old }));
      expect(e.details).toEqual([old]);
      expect('reason' in e).toBe(false);
    }
  });

  it('clears old reasons with no new home', () => {
    for (const old of ['scramble', 'soft_goal', 'other']) {
      const e = migrateEvent(goal({ reason: old }));
      expect('reason' in e).toBe(false);
      expect(e.details).toBeUndefined();
    }
  });

  it('leaves updatedAt and other fields alone', () => {
    const e = migrateEvent(goal({ reason: 'screen', netZone: 'five_hole', updatedAt: '2026-09-01T00:00:00Z' }));
    expect(e).toMatchObject({ netZone: 'five_hole', updatedAt: '2026-09-01T00:00:00Z' });
  });

  it('leaves new-format events untouched', () => {
    const e = goal({ reason: 'clean_beat', details: ['screen', 'deflection'] });
    expect(migrateEvent(e)).toBe(e);
    const save = goal({ type: 'save' });
    expect(migrateEvent(save)).toBe(save);
  });

  it('is idempotent', () => {
    const once = migrateEvent(goal({ reason: 'rebound' }));
    expect(migrateEvent(once)).toEqual(once);
  });
});
