import type { Game, ShotEvent } from '../types';
import { periodLabel, sortEvents } from './periods';

export const SCHEMA_VERSION = 1;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  games: Game[];
  events: ShotEvent[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** goalie-tracker-YYYY-MM-DD-HHmm.json, in local time. */
export function backupFilename(d: Date, ext = 'json'): string {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `goalie-tracker-${date}-${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`;
}

function isRecord(r: unknown): r is { id: string; updatedAt: string } {
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof (r as { id?: unknown }).id === 'string' &&
    typeof (r as { updatedAt?: unknown }).updatedAt === 'string'
  );
}

/** Check a parsed file is a backup we understand. Throws an Error with a message for the coach. */
export function validateBackup(json: unknown): BackupFile {
  if (typeof json !== 'object' || json === null || !('schemaVersion' in json)) {
    throw new Error("This file isn't a Goalie Tracker backup.");
  }
  const file = json as Partial<BackupFile>;
  if (file.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `This backup uses format version ${String(file.schemaVersion)}, which this version of the app can't read. Update the app and try again.`,
    );
  }
  if (!Array.isArray(file.games) || !Array.isArray(file.events)) {
    throw new Error('This backup is missing its games or events.');
  }
  if (!file.games.every(isRecord) || !file.events.every((e) => isRecord(e) && typeof e.gameId === 'string')) {
    throw new Error('This backup has damaged records and was not imported.');
  }
  return file as BackupFile;
}

const CSV_COLUMNS = [
  'date',
  'opponent',
  'home_away',
  'period',
  'order',
  'type',
  'high_danger',
  'clock',
  'net_zone',
  'reason',
  'strength',
  'notes',
  'shot_x',
  'shot_y',
];

function csvCell(value: string | number | boolean | undefined): string {
  const s = value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per (non-deleted) event with its game's info, games oldest first. */
export function toCsv(games: Game[], events: ShotEvent[]): string {
  const live = games
    .filter((g) => !g.deleted)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const rows = [CSV_COLUMNS.join(',')];
  for (const game of live) {
    const gameEvents = sortEvents(events.filter((e) => e.gameId === game.id && !e.deleted));
    gameEvents.forEach((e, i) => {
      rows.push(
        [
          game.date,
          game.opponent,
          game.homeAway,
          periodLabel(e.period),
          i + 1,
          e.type,
          e.highDanger ? 'yes' : 'no',
          e.gameClock,
          e.netZone,
          e.reason,
          e.strength,
          e.notes,
          e.shotOrigin?.x,
          e.shotOrigin?.y,
        ]
          .map(csvCell)
          .join(','),
      );
    });
  }
  return rows.join('\r\n') + '\r\n';
}
