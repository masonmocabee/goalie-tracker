const STEP = 1000;

/** sortKey for an event appended after the last event in a period. */
export function appendKey(lastKey?: number): number {
  return lastKey === undefined ? STEP : lastKey + STEP;
}

/**
 * sortKey for an event inserted between two neighbours in the same period.
 * `before` missing = insert at the start of the period; `after` missing = insert at the end.
 */
export function betweenKey(before?: number, after?: number): number {
  if (after === undefined) return appendKey(before);
  return ((before ?? 0) + after) / 2;
}
