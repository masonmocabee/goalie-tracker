// Only files in src/data/ may import this module.
import Dexie, { type EntityTable } from 'dexie';
import type { Game, ShotEvent } from '../types';

export const db = new Dexie('goalie-tracker') as Dexie & {
  games: EntityTable<Game, 'id'>;
  events: EntityTable<ShotEvent, 'id'>;
};

db.version(1).stores({
  games: 'id, date',
  events: 'id, gameId',
});

export function now(): string {
  return new Date().toISOString();
}
