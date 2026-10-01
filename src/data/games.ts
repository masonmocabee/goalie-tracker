import { newId } from '../lib/id';
import type { Game } from '../types';
import { db, now } from './db';

export type NewGame = Pick<Game, 'date' | 'opponent' | 'homeAway' | 'numPeriods'>;

export async function createGame(input: NewGame): Promise<Game> {
  const t = now();
  const game: Game = { ...input, id: newId(), createdAt: t, updatedAt: t, deleted: false };
  await db.games.add(game);
  return game;
}

export async function updateGame(
  id: string,
  changes: Partial<Omit<Game, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.games.update(id, { ...changes, updatedAt: now() });
}

/** Soft-delete a game and all of its events, so the delete survives export/import merges. */
export async function deleteGame(id: string): Promise<void> {
  const t = now();
  await db.transaction('rw', db.games, db.events, async () => {
    await db.games.update(id, { deleted: true, updatedAt: t });
    await db.events
      .where('gameId')
      .equals(id)
      .filter((e) => !e.deleted)
      .modify({ deleted: true, updatedAt: t });
  });
}
