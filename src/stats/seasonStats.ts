import { comparePeriod } from '../lib/periods';
import type { Game, GoalDetail, GoalReason, NetZone, Period, ShotEvent, ShotOrigin } from '../types';
import { highDangerTotals, totals, type ShotTotals } from './gameStats';

export interface GameEvents {
  game: Game;
  events: ShotEvent[];
}

export interface TrendPoint {
  gameId: string;
  date: string;
  opponent: string;
  svPct: number | null;
  hdSvPct: number | null;
}

export interface SeasonStats {
  games: number;
  home: number;
  away: number;
  overall: ShotTotals;
  highDanger: ShotTotals;
  nonHighDanger: ShotTotals;
  /** Goals against per game (not minutes-based: youth periods get cut short). Null with no games. */
  gaa: number | null;
  /** Finished games with shots against and no goals, newest first. */
  shutouts: { gameId: string; date: string; opponent: string; saves: number }[];
  /** Only periods that have at least one shot, in period order (OT last). */
  byPeriod: { period: Period; stats: ShotTotals }[];
  /** A goal with several details counts once under each. Most common first. */
  goalsByDetail: { detail: GoalDetail; count: number }[];
  goalsMissingDetail: number;
  goalsByReason: { reason: GoalReason; count: number }[]; // most common first
  goalsByZone: Partial<Record<NetZone, number>>;
  /** Where goals were shot from, for those that have a location. */
  goalOrigins: ShotOrigin[];
  goalsMissingReason: number;
  /** One point per game with shots, oldest first. */
  trend: TrendPoint[];
}

/** A game is over once it has been ended, or its date has passed. `today` is YYYY-MM-DD. */
export function isComplete(game: Game, today: string): boolean {
  return !!game.final || game.date < today;
}

/** A finished game with at least one shot against and no goals. */
export function isShutout(game: Game, events: ShotEvent[], today: string): boolean {
  const t = totals(events);
  return isComplete(game, today) && t.shots > 0 && t.goals === 0;
}

/** Season totals across the given games. Deleted events are ignored. `today` is YYYY-MM-DD. */
export function seasonStats(games: GameEvents[], today: string): SeasonStats {
  const live = games.map(({ game, events }) => ({ game, events: events.filter((e) => !e.deleted) }));
  const all = live.flatMap((g) => g.events);
  const goals = all.filter((e) => e.type === 'goal');

  const detailCounts = new Map<GoalDetail, number>();
  let goalsMissingDetail = 0;
  const reasonCounts = new Map<GoalReason, number>();
  const goalsByZone: Partial<Record<NetZone, number>> = {};
  let goalsMissingReason = 0;
  for (const g of goals) {
    for (const d of g.details ?? []) detailCounts.set(d, (detailCounts.get(d) ?? 0) + 1);
    if (!g.details?.length) goalsMissingDetail++;
    if (g.reason) reasonCounts.set(g.reason, (reasonCounts.get(g.reason) ?? 0) + 1);
    else goalsMissingReason++;
    if (g.netZone) goalsByZone[g.netZone] = (goalsByZone[g.netZone] ?? 0) + 1;
  }

  const periods = [...new Set(all.map((e) => e.period))].sort(comparePeriod);

  return {
    games: live.length,
    home: live.filter((g) => g.game.homeAway === 'home').length,
    away: live.filter((g) => g.game.homeAway === 'away').length,
    overall: totals(all),
    highDanger: highDangerTotals(all),
    nonHighDanger: totals(all.filter((e) => !e.highDanger)),
    gaa: live.length ? goals.length / live.length : null,
    shutouts: live
      .filter(({ game, events }) => isShutout(game, events, today))
      .sort((a, b) => b.game.date.localeCompare(a.game.date))
      .map(({ game, events }) => ({
        gameId: game.id,
        date: game.date,
        opponent: game.opponent,
        saves: totals(events).saves,
      })),
    byPeriod: periods.map((period) => ({ period, stats: totals(all.filter((e) => e.period === period)) })),
    goalsByDetail: [...detailCounts]
      .map(([detail, count]) => ({ detail, count }))
      .sort((a, b) => b.count - a.count),
    goalsMissingDetail,
    goalsByReason: [...reasonCounts]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    goalsByZone,
    goalOrigins: goals.flatMap((g) => (g.shotOrigin ? [g.shotOrigin] : [])),
    goalsMissingReason,
    trend: [...live]
      .filter((g) => g.events.length > 0)
      .sort((a, b) => a.game.date.localeCompare(b.game.date) || a.game.createdAt.localeCompare(b.game.createdAt))
      .map(({ game, events }) => ({
        gameId: game.id,
        date: game.date,
        opponent: game.opponent,
        svPct: totals(events).svPct,
        hdSvPct: highDangerTotals(events).svPct,
      })),
  };
}

export type DateRange = 'all' | 'last5' | 'last30';

export interface SeasonFilter {
  range: DateRange;
  opponent: string | null; // null = all opponents
}

/** Apply the dashboard filters. `today` is YYYY-MM-DD. Opponent applies before "last 5". */
export function filterGames<T extends GameEvents>(games: T[], filter: SeasonFilter, today: string): T[] {
  let result = filter.opponent ? games.filter((g) => g.game.opponent === filter.opponent) : games;
  if (filter.range === 'last5') {
    result = [...result].sort((a, b) => b.game.date.localeCompare(a.game.date)).slice(0, 5);
  } else if (filter.range === 'last30') {
    const [y, m, d] = today.split('-').map(Number);
    const cutoff = new Date(Date.UTC(y, m - 1, d - 30)).toISOString().slice(0, 10);
    result = result.filter((g) => g.game.date >= cutoff);
  }
  return result;
}
