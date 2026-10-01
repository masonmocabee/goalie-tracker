import { describe, expect, it } from 'vitest';
import { findDropTarget, type RowBox, type SectionBox } from './dragDrop';

// Two periods. P1 rows a, b, c (50px tall); P2 is empty.
const rows: RowBox[] = [
  { id: 'a', period: 1, sortKey: 1000, top: 0, bottom: 50 },
  { id: 'b', period: 1, sortKey: 2000, top: 60, bottom: 110 },
  { id: 'c', period: 1, sortKey: 3000, top: 120, bottom: 170 },
];
const sections: SectionBox[] = [
  { period: 1, top: 0, bottom: 180 },
  { period: 2, top: 220, bottom: 260 },
];

describe('findDropTarget', () => {
  it('moves a row down between two others', () => {
    const t = findDropTarget(rows, sections, 'a', 130)!;
    expect(t).toMatchObject({ period: 1, beforeKey: 2000, afterKey: 3000, unchanged: false });
    expect(t.indicatorY).toBe(115);
  });

  it('moves a row to the start of its period', () => {
    expect(findDropTarget(rows, sections, 'c', 10)).toMatchObject({
      period: 1,
      beforeKey: undefined,
      afterKey: 1000,
      unchanged: false,
    });
  });

  it('moves a row to the end of its period', () => {
    expect(findDropTarget(rows, sections, 'a', 175)).toMatchObject({
      beforeKey: 3000,
      afterKey: undefined,
      unchanged: false,
    });
  });

  it('reports no change when released in its own slot', () => {
    expect(findDropTarget(rows, sections, 'b', 80)!.unchanged).toBe(true);
    expect(findDropTarget(rows, sections, 'b', 40)!.unchanged).toBe(true);
  });

  it('moves a row into an empty period', () => {
    expect(findDropTarget(rows, sections, 'b', 240)).toMatchObject({
      period: 2,
      beforeKey: undefined,
      afterKey: undefined,
      indicatorY: 224,
      unchanged: false,
    });
  });

  it('uses the last period when dragged below everything', () => {
    expect(findDropTarget(rows, sections, 'a', 999)!.period).toBe(2);
  });
});
