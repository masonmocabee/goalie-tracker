import { backupFilename, SCHEMA_VERSION, toCsv, validateBackup, type BackupFile } from '../lib/backupFormat';
import { mergeRecords } from '../lib/merge';
import { shareOrDownload, type ShareResult } from '../lib/share';
import { db, now } from './db';

/** Export a full backup to the share sheet (or a download) and remember when. */
export async function backUpNow(): Promise<ShareResult> {
  const json = JSON.stringify(await exportAll(), null, 2);
  const result = await shareOrDownload(backupFilename(new Date()), json, 'application/json');
  if (result !== 'cancelled') markBackedUp();
  return result;
}

/** Export the season CSV to the share sheet (or a download). */
export async function shareCsv(): Promise<ShareResult> {
  return shareOrDownload(backupFilename(new Date(), 'csv'), await exportCsv(), 'text/csv');
}

/** Everything, including soft-deleted records, so deletes survive a merge. */
export async function exportAll(): Promise<BackupFile> {
  const [games, events] = await Promise.all([db.games.toArray(), db.events.toArray()]);
  return { schemaVersion: SCHEMA_VERSION, exportedAt: now(), games, events };
}

/** The season as CSV for spreadsheets (deleted records left out). */
export async function exportCsv(): Promise<string> {
  const [games, events] = await Promise.all([db.games.toArray(), db.events.toArray()]);
  return toCsv(games, events);
}

export interface ImportSummary {
  gamesAdded: number;
  gamesUpdated: number;
  eventsAdded: number;
  eventsUpdated: number;
}

/** Validate a parsed backup file and merge it in (newer `updatedAt` wins). Throws on a bad file. */
export async function importBackup(json: unknown): Promise<ImportSummary> {
  const file = validateBackup(json);
  return db.transaction('rw', db.games, db.events, async () => {
    const games = mergeRecords(await db.games.toArray(), file.games);
    const events = mergeRecords(await db.events.toArray(), file.events);
    await db.games.bulkPut(games.toWrite);
    await db.events.bulkPut(events.toWrite);
    return {
      gamesAdded: games.added,
      gamesUpdated: games.updated,
      eventsAdded: events.added,
      eventsUpdated: events.updated,
    };
  });
}

// When the last backup was taken, and when the coach last said "Later" to the nudge.
// localStorage is fine here: it's a per-device reminder, not data worth syncing.
const BACKED_UP_KEY = 'goalie-tracker:lastBackupAt';
const DISMISSED_KEY = 'goalie-tracker:backupNudgeDismissedAt';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked; the nudge will just show again.
  }
}

export function lastBackupAt(): string | null {
  return read(BACKED_UP_KEY);
}

export function markBackedUp(): void {
  write(BACKED_UP_KEY, now());
}

export function dismissBackupNudge(): void {
  write(DISMISSED_KEY, now());
}

/** True if anything changed since the last backup (or the last "Later"). */
export function needsBackup(latestChange: string | undefined): boolean {
  if (!latestChange) return false;
  const seen = [read(BACKED_UP_KEY), read(DISMISSED_KEY)].filter((t): t is string => !!t);
  return seen.every((t) => latestChange > t);
}
