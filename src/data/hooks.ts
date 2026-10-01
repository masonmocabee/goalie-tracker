import { useLiveQuery } from 'dexie-react-hooks';
import { sortEvents } from '../lib/periods';
import type { Game, ShotEvent } from '../types';
import { db } from './db';

// Live queries. Each returns undefined while loading.

export interface GameWithEvents {
  game: Game;
  events: ShotEvent[];
}

/** All games, newest first, each with its (non-deleted) events. */
export function useGamesWithEvents(): GameWithEvents[] | undefined {
  return useLiveQuery(async () => {
    const games = (await db.games.toArray()).filter((g) => !g.deleted);
    const events = (await db.events.toArray()).filter((e) => !e.deleted);
    const byGame = new Map<string, ShotEvent[]>();
    for (const e of events) {
      const list = byGame.get(e.gameId) ?? [];
      list.push(e);
      byGame.set(e.gameId, list);
    }
    return games
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((game) => ({ game, events: byGame.get(game.id) ?? [] }));
  });
}

/** A single game; null if it doesn't exist or was deleted. */
export function useGame(id: string | undefined): Game | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const game = await db.games.get(id);
    return game && !game.deleted ? game : null;
  }, [id]);
}

/** A game's non-deleted events, ordered by period then sortKey. */
export function useGameEvents(gameId: string | undefined): ShotEvent[] | undefined {
  return useLiveQuery(async () => {
    if (!gameId) return [];
    const events = await db.events.where('gameId').equals(gameId).toArray();
    return sortEvents(events.filter((e) => !e.deleted));
  }, [gameId]);
}
