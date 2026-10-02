import { describe, expect, it } from 'vitest';
import { mergeRecords } from './merge';

const rec = (id: string, updatedAt: string, extra: Record<string, unknown> = {}) => ({ id, updatedAt, ...extra });

describe('mergeRecords', () => {
  it('adds records with new ids', () => {
    const r = mergeRecords([rec('a', '2026-10-01T10:00:00Z')], [rec('b', '2026-10-01T09:00:00Z')]);
    expect(r).toEqual({ toWrite: [rec('b', '2026-10-01T09:00:00Z')], added: 1, updated: 0 });
  });

  it('takes the incoming record when it is newer', () => {
    const incoming = rec('a', '2026-10-02T10:00:00Z', { opponent: 'Hawks' });
    const r = mergeRecords([rec('a', '2026-10-01T10:00:00Z')], [incoming]);
    expect(r).toEqual({ toWrite: [incoming], added: 0, updated: 1 });
  });

  it('keeps the existing record when it is newer', () => {
    const r = mergeRecords([rec('a', '2026-10-02T10:00:00Z')], [rec('a', '2026-10-01T10:00:00Z')]);
    expect(r).toEqual({ toWrite: [], added: 0, updated: 0 });
  });

  it('is idempotent: re-importing the same records changes nothing', () => {
    const records = [rec('a', '2026-10-01T10:00:00Z'), rec('b', '2026-10-01T11:00:00Z')];
    const first = mergeRecords([], records);
    expect(first.added).toBe(2);
    const second = mergeRecords(first.toWrite, records);
    expect(second).toEqual({ toWrite: [], added: 0, updated: 0 });
  });

  it('propagates a newer soft delete', () => {
    const deleted = rec('a', '2026-10-02T10:00:00Z', { deleted: true });
    const r = mergeRecords([rec('a', '2026-10-01T10:00:00Z', { deleted: false })], [deleted]);
    expect(r.toWrite).toEqual([deleted]);
  });

  it('does not undo a local delete with an older backup', () => {
    const r = mergeRecords(
      [rec('a', '2026-10-02T10:00:00Z', { deleted: true })],
      [rec('a', '2026-10-01T10:00:00Z', { deleted: false })],
    );
    expect(r.toWrite).toEqual([]);
  });

  it('keeps only the newest copy when a file repeats an id', () => {
    const r = mergeRecords([], [rec('a', '2026-10-01T10:00:00Z'), rec('a', '2026-10-02T10:00:00Z'), rec('a', '2026-09-30T10:00:00Z')]);
    expect(r.added).toBe(1);
    expect(r.updated).toBe(1);
    expect(r.toWrite.at(-1)).toEqual(rec('a', '2026-10-02T10:00:00Z'));
  });
});
