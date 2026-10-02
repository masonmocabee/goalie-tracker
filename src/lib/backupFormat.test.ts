import { describe, expect, it } from 'vitest';
import type { Game, ShotEvent } from '../types';
import { backupFilename, toCsv, validateBackup } from './backupFormat';

const T = '2026-10-01T10:00:00.000Z';

function game(over: Partial<Game> = {}): Game {
  return { id: 'g1', date: '2026-10-01', opponent: 'Ice Hawks', homeAway: 'home', numPeriods: 3, createdAt: T, updatedAt: T, deleted: false, ...over };
}

function ev(over: Partial<ShotEvent> = {}): ShotEvent {
  return { id: 'e1', gameId: 'g1', type: 'save', period: 1, sortKey: 1000, highDanger: false, createdAt: T, updatedAt: T, deleted: false, ...over };
}

describe('backupFilename', () => {
  it('uses local date and 24h time', () => {
    expect(backupFilename(new Date(2026, 9, 2, 19, 5))).toBe('goalie-tracker-2026-10-02-1905.json');
  });
});

describe('validateBackup', () => {
  const ok = { schemaVersion: 1, exportedAt: T, games: [game()], events: [ev()] };

  it('accepts a valid backup', () => {
    expect(validateBackup(ok)).toBe(ok);
  });

  it('rejects things that are not backups', () => {
    expect(() => validateBackup(null)).toThrow(/isn't a Goalie Tracker backup/);
    expect(() => validateBackup([1, 2])).toThrow(/isn't a Goalie Tracker backup/);
    expect(() => validateBackup({ hello: 'world' })).toThrow(/isn't a Goalie Tracker backup/);
  });

  it('rejects unknown schema versions', () => {
    expect(() => validateBackup({ ...ok, schemaVersion: 2 })).toThrow(/version 2/);
  });

  it('rejects missing arrays and damaged records', () => {
    expect(() => validateBackup({ schemaVersion: 1, games: [] })).toThrow(/missing/);
    expect(() => validateBackup({ ...ok, events: [{ id: 'x', updatedAt: T }] })).toThrow(/damaged/);
    expect(() => validateBackup({ ...ok, games: [{ id: 'x' }] })).toThrow(/damaged/);
  });
});

describe('toCsv', () => {
  it('writes a header and one row per event in timeline order', () => {
    const csv = toCsv(
      [game()],
      [
        ev({ id: 'b', period: 2, sortKey: 1000, type: 'goal', netZone: 'five_hole', reason: 'screen', strength: 'PP', gameClock: '4:12' }),
        ev({ id: 'a', period: 1, sortKey: 1000, highDanger: true }),
      ],
    );
    expect(csv.split('\r\n')).toEqual([
      'date,opponent,home_away,period,order,type,high_danger,clock,net_zone,reason,strength,notes',
      '2026-10-01,Ice Hawks,home,P1,1,save,yes,,,,,',
      '2026-10-01,Ice Hawks,home,P2,2,goal,no,4:12,five_hole,screen,PP,',
      '',
    ]);
  });

  it('skips deleted games and events', () => {
    const csv = toCsv(
      [game(), game({ id: 'g2', deleted: true })],
      [ev({ deleted: true }), ev({ id: 'e2', gameId: 'g2' })],
    );
    expect(csv.trim().split('\r\n')).toHaveLength(1);
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = toCsv([game({ opponent: 'Hawks, Jr.' })], [ev({ notes: 'said "screen"\nthen tip' })]);
    expect(csv).toContain('"Hawks, Jr."');
    expect(csv).toContain('"said ""screen""\nthen tip"');
  });
});
