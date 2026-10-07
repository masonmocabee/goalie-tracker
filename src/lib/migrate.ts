import { GOAL_DETAIL_LABELS, GOAL_REASON_LABELS, type GoalDetail, type ShotEvent } from '../types';

/**
 * Before Oct 2026 a goal had a single `reason` that mixed the kind of chance (screen,
 * rebound...) with a few judgment calls. Those values now live in `details`; `reason` is the
 * goalie-side cause (clean beat, technique...). Old values that are also details move over;
 * scramble, soft goal and other are dropped. `updatedAt` is left alone: this is a format
 * change, not an edit, so it must not win merges against real edits.
 *
 * Safe to run on any event, old or new: the old and new reason values don't overlap.
 */
export function migrateEvent<T extends ShotEvent>(event: T): T {
  const reason = event.reason as string | undefined;
  if (reason === undefined || reason in GOAL_REASON_LABELS) return event;
  const { reason: _old, ...rest } = event;
  if (!(reason in GOAL_DETAIL_LABELS)) return rest as T;
  const detail = reason as GoalDetail;
  const details = rest.details?.includes(detail) ? rest.details : [...(rest.details ?? []), detail];
  return { ...rest, details } as T;
}
