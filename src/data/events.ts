import { newId } from '../lib/id';
import { appendKey, betweenKey } from '../lib/sortKey';
import type { Period, ShotEvent } from '../types';
import { db, now } from './db';

export type NewEventFields = Pick<ShotEvent, 'type' | 'highDanger'>;

async function lastKeyInPeriod(gameId: string, period: Period): Promise<number | undefined> {
  const events = await db.events.where('gameId').equals(gameId).toArray();
  let last: number | undefined;
  for (const e of events) {
    if (e.period === period && (last === undefined || e.sortKey > last)) last = e.sortKey;
  }
  return last;
}

async function addEvent(gameId: string, period: Period, sortKey: number, fields: NewEventFields) {
  const t = now();
  const event: ShotEvent = {
    ...fields,
    id: newId(),
    gameId,
    period,
    sortKey,
    createdAt: t,
    updatedAt: t,
    deleted: false,
  };
  await db.events.add(event);
  return event;
}

/** Log an event at the end of a period (live tracking). */
export async function appendEvent(gameId: string, period: Period, fields: NewEventFields) {
  // Transaction so rapid taps can't read the same "last key" and collide.
  return db.transaction('rw', db.events, async () =>
    addEvent(gameId, period, appendKey(await lastKeyInPeriod(gameId, period)), fields),
  );
}

/**
 * Insert an event between two neighbours in a period (reconciliation).
 * Pass undefined for `beforeKey` to insert at the start, or for `afterKey` to insert at the end.
 */
export async function insertEvent(
  gameId: string,
  period: Period,
  beforeKey: number | undefined,
  afterKey: number | undefined,
  fields: NewEventFields,
) {
  if (afterKey === undefined) return appendEvent(gameId, period, fields);
  return addEvent(gameId, period, betweenKey(beforeKey, afterKey), fields);
}

export async function updateEvent(
  id: string,
  changes: Partial<Omit<ShotEvent, 'id' | 'gameId' | 'createdAt' | 'sortKey'>>,
): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    const existing = await db.events.get(id);
    if (!existing) return;
    const update: Partial<ShotEvent> = { ...changes, updatedAt: now() };
    // Moving to another period puts the event at the end of that period.
    if (changes.period !== undefined && changes.period !== existing.period) {
      update.sortKey = appendKey(await lastKeyInPeriod(existing.gameId, changes.period));
    }
    await db.events.update(id, update);
  });
}

/**
 * Move an event (drag and drop) to sit between two neighbours, possibly in another period.
 * Pass undefined for `beforeKey` to move to the start, or for `afterKey` to move to the end.
 */
export async function moveEvent(
  id: string,
  period: Period,
  beforeKey: number | undefined,
  afterKey: number | undefined,
): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    const existing = await db.events.get(id);
    if (!existing) return;
    const sortKey =
      afterKey === undefined
        ? appendKey(beforeKey ?? (await lastKeyInPeriod(existing.gameId, period)))
        : betweenKey(beforeKey, afterKey);
    await db.events.update(id, { period, sortKey, updatedAt: now() });
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.update(id, { deleted: true, updatedAt: now() });
}

/** Soft-delete the most recently logged event in a game. Returns it, if any. */
export async function undoLast(gameId: string): Promise<ShotEvent | undefined> {
  const events = await db.events.where('gameId').equals(gameId).toArray();
  let latest: ShotEvent | undefined;
  for (const e of events) {
    if (!e.deleted && (!latest || e.createdAt >= latest.createdAt)) latest = e;
  }
  if (latest) await deleteEvent(latest.id);
  return latest;
}
