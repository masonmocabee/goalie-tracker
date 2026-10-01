import type { Period } from '../types';

/** A rendered event row, in display order, with its on-screen vertical position. */
export interface RowBox {
  id: string;
  period: Period;
  sortKey: number;
  top: number;
  bottom: number;
}

/** A period's rows area, in display order, with its on-screen vertical position. */
export interface SectionBox {
  period: Period;
  top: number;
  bottom: number;
}

export interface DropTarget {
  period: Period;
  beforeKey?: number;
  afterKey?: number;
  /** Where to draw the drop indicator (same coordinates as the boxes). */
  indicatorY: number;
  /** True when dropping here would leave the event where it already is. */
  unchanged: boolean;
}

/** Work out where a dragged row would land if released at vertical position `y`. */
export function findDropTarget(
  rows: RowBox[],
  sections: SectionBox[],
  draggedId: string,
  y: number,
): DropTarget | null {
  if (sections.length === 0) return null;
  const section = sections.find((s) => y < s.bottom) ?? sections[sections.length - 1];
  const dragged = rows.find((r) => r.id === draggedId);

  const periodRows = rows.filter((r) => r.period === section.period);
  const others = periodRows.filter((r) => r.id !== draggedId);
  const index = others.filter((r) => (r.top + r.bottom) / 2 < y).length;
  const before = others[index - 1];
  const after = others[index];

  let indicatorY: number;
  if (before && after) indicatorY = (before.bottom + after.top) / 2;
  else if (before) indicatorY = before.bottom + 4;
  else if (after) indicatorY = after.top - 4;
  else indicatorY = section.top + 4;

  const originalIndex = periodRows.findIndex((r) => r.id === draggedId);
  const unchanged = dragged?.period === section.period && originalIndex === index;

  return { period: section.period, beforeKey: before?.sortKey, afterKey: after?.sortKey, indicatorY, unchanged };
}
