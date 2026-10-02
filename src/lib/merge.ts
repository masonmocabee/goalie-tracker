export interface Versioned {
  id: string;
  updatedAt: string; // ISO timestamp
}

export interface MergeResult<T> {
  toWrite: T[]; // incoming records that win and need saving
  added: number;
  updated: number;
}

/**
 * Upsert `incoming` into `existing` by id. New ids are added; for ids we already have, the
 * record with the newer `updatedAt` wins. Ties keep the existing record, so importing the
 * same file twice changes nothing. Soft deletes are just updates, so they merge the same way.
 */
export function mergeRecords<T extends Versioned>(existing: T[], incoming: T[]): MergeResult<T> {
  const current = new Map(existing.map((r) => [r.id, r]));
  const result: MergeResult<T> = { toWrite: [], added: 0, updated: 0 };
  for (const record of incoming) {
    const have = current.get(record.id);
    if (!have) {
      result.added++;
    } else if (record.updatedAt > have.updatedAt) {
      result.updated++;
    } else {
      continue;
    }
    result.toWrite.push(record);
    current.set(record.id, record); // a file listing the same id twice keeps the newest
  }
  return result;
}
