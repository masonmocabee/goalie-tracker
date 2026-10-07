import { describe, expect, it } from 'vitest';
import type { Game, ShotEvent } from '../types';
import { filterGames, seasonStats } from './seasonStats';

const TODAY = '2026-09-30';

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

function game(partial: Partial<Game>): Game {
  return {
    id: crypto.randomUUID(),
    date: '2026-09-01',
    opponent: 'Hawks',
    numPeriods: 3,
    createdAt: '',
    updatedAt: '',
    deleted: false,
    ...partial,
  };
}

describe('seasonStats', () => {
  it('handles no games', () => {
    const s = seasonStats([], TODAY);
    expect(s.games).toBe(0);
    expect(s.overall.svPct).toBeNull();
    expect(s.gaa).toBeNull();
    expect(s.byPeriod).toEqual([]);
    expect(s.trend).toEqual([]);
  });

  it('combines games and splits HD vs non-HD', () => {
    const g1 = [
      ev({ type: 'save' }),
      ev({ type: 'save', highDanger: true }),
      ev({ type: 'goal', highDanger: true, details: ['rebound'], reason: 'effort', netZone: 'glove_high' }),
    ];
    const g2 = [
      ev({ type: 'save', period: 'OT' }),
      ev({ type: 'goal', period: 2, details: ['rebound', 'screen'], reason: 'effort', netZone: 'left_pad_low' }),
      ev({ type: 'goal', period: 2, details: ['screen'], reason: 'focus', netZone: 'glove_high' }),
      ev({ type: 'goal', period: 3 }),
      ev({ type: 'goal', deleted: true }),
    ];
    const s = seasonStats([
      { game: game({ homeAway: 'home' }), events: g1 },
      { game: game({ homeAway: 'away' }), events: g2 },
    ], TODAY);

    expect(s).toMatchObject({ games: 2, home: 1, away: 1 });
    expect(s.overall).toMatchObject({ shots: 7, saves: 3, goals: 4 });
    expect(s.highDanger).toMatchObject({ shots: 2, saves: 1, goals: 1 });
    expect(s.nonHighDanger).toMatchObject({ shots: 5, saves: 2, goals: 3 });
    expect(s.byPeriod.map((p) => p.period)).toEqual([1, 2, 3, 'OT']);
    expect(s.byPeriod[1].stats).toMatchObject({ shots: 2, goals: 2 });
    expect(s.goalsByReason).toEqual([
      { reason: 'effort', count: 2 },
      { reason: 'focus', count: 1 },
    ]);
    expect(s.goalsByDetail).toEqual([
      { detail: 'rebound', count: 2 },
      { detail: 'screen', count: 2 },
    ]);
    expect(s.goalsMissingReason).toBe(1);
    expect(s.goalsMissingDetail).toBe(1);
    expect(s.goalsByZone).toEqual({ glove_high: 2, left_pad_low: 1 });
  });

  it('collects goal locations, skipping saves, deleted goals and goals without one', () => {
    const s = seasonStats(
      [
        {
          game: game({}),
          events: [
            ev({ type: 'goal', shotOrigin: { x: 0.5, y: 0.3 } }),
            ev({ type: 'goal' }),
            ev({ type: 'goal', shotOrigin: { x: 0.1, y: 0.1 }, deleted: true }),
            ev({ type: 'save', shotOrigin: { x: 0.9, y: 0.9 } }),
          ],
        },
        { game: game({}), events: [ev({ type: 'goal', shotOrigin: { x: 0.4, y: 0.2 } })] },
      ],
      TODAY,
    );
    expect(s.goalOrigins).toEqual([
      { x: 0.5, y: 0.3 },
      { x: 0.4, y: 0.2 },
    ]);
  });

  it('computes GAA as goals against per game', () => {
    const s = seasonStats(
      [
        { game: game({}), events: [ev({ type: 'goal' }), ev({ type: 'goal' }), ev({ type: 'goal' })] },
        { game: game({}), events: [ev({ type: 'save' })] },
        { game: game({}), events: [ev({ type: 'goal' }), ev({ type: 'goal', deleted: true })] },
      ],
      TODAY,
    );
    expect(s.gaa).toBeCloseTo(4 / 3);
  });

  it('lists shutouts: finished games with shots and no goals, newest first', () => {
    const s = seasonStats(
      [
        { game: game({ id: 'old', date: '2026-09-01' }), events: [ev({}), ev({})] },
        { game: game({ id: 'newer', date: '2026-09-20' }), events: [ev({}), ev({ type: 'goal', deleted: true })] },
        { game: game({ id: 'scored', date: '2026-09-10' }), events: [ev({}), ev({ type: 'goal' })] },
        { game: game({ id: 'empty', date: '2026-09-12' }), events: [] },
        // Today's game in progress doesn't count until it's ended...
        { game: game({ id: 'live', date: TODAY }), events: [ev({})] },
        // ...but does once it's marked final.
        { game: game({ id: 'ended', date: TODAY, final: true }), events: [ev({}), ev({}), ev({})] },
      ],
      TODAY,
    );
    expect(s.shutouts.map((x) => x.gameId)).toEqual(['ended', 'newer', 'old']);
    expect(s.shutouts[0].saves).toBe(3);
  });

  it('builds a trend oldest first, skipping games with no shots', () => {
    const s = seasonStats([
      { game: game({ id: 'b', date: '2026-09-10' }), events: [ev({ type: 'save' }), ev({ type: 'goal', highDanger: true })] },
      { game: game({ id: 'a', date: '2026-09-03' }), events: [ev({ type: 'save' })] },
      { game: game({ id: 'c', date: '2026-09-17' }), events: [] },
    ], TODAY);
    expect(s.trend.map((t) => t.gameId)).toEqual(['a', 'b']);
    expect(s.trend[0]).toMatchObject({ svPct: 1, hdSvPct: null });
    expect(s.trend[1]).toMatchObject({ svPct: 0.5, hdSvPct: 0 });
  });
});

describe('filterGames', () => {
  const games = ['2026-08-01', '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'].map(
    (date, i) => ({ game: game({ date, opponent: i % 2 ? 'Hawks' : 'Blues' }), events: [] }),
  );
  
  it('returns everything for the full season', () => {
    expect(filterGames(games, { range: 'all', opponent: null }, TODAY)).toHaveLength(6);
  });

  it('keeps the 5 most recent games', () => {
    const r = filterGames(games, { range: 'last5', opponent: null }, TODAY);
    expect(r.map((g) => g.game.date)).not.toContain('2026-08-01');
    expect(r).toHaveLength(5);
  });

  it('keeps the last 30 days', () => {
    const r = filterGames(games, { range: 'last30', opponent: null }, TODAY);
    expect(r.map((g) => g.game.date)).toEqual(['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);
  });

  it('filters by opponent', () => {
    const r = filterGames(games, { range: 'all', opponent: 'Hawks' }, TODAY);
    expect(r.every((g) => g.game.opponent === 'Hawks')).toBe(true);
    expect(r).toHaveLength(3);
  });
});
