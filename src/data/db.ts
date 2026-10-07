// Only files in src/data/ may import this module.
import Dexie, { type EntityTable } from 'dexie';
import { migrateEvent } from '../lib/migrate';
import type { Game, ShotEvent } from '../types';

export const db = new Dexie('goalie-tracker') as Dexie & {
  games: EntityTable<Game, 'id'>;
  events: EntityTable<ShotEvent, 'id'>;
};

db.version(1).stores({
  games: 'id, date',
  events: 'id, gameId',
});

// v2: goal "reason" split into details (kind of chance) and reason (goalie-side cause).
db.version(2)
  .stores({})
  .upgrade((tx) =>
    tx
      .table<ShotEvent>('events')
      .toCollection()
      .modify((e, ref) => {
        ref.value = migrateEvent(e);
      }),
  );

export function now(): string {
  return new Date().toISOString();
}
