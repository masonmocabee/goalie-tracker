import { describe, expect, it } from 'vitest';
import { appendKey, betweenKey } from './sortKey';

describe('appendKey', () => {
  it('starts at 1000 and steps by 1000', () => {
    expect(appendKey()).toBe(1000);
    expect(appendKey(3000)).toBe(4000);
  });
});

describe('betweenKey', () => {
  it('takes the midpoint between neighbours', () => {
    expect(betweenKey(1000, 2000)).toBe(1500);
    expect(betweenKey(1000, 1500)).toBe(1250);
  });

  it('inserts before the first event of a period', () => {
    expect(betweenKey(undefined, 1000)).toBe(500);
  });

  it('appends at the end of a period', () => {
    expect(betweenKey(2000, undefined)).toBe(3000);
    expect(betweenKey()).toBe(1000);
  });

  it('keeps order after repeated inserts', () => {
    let lo = 1000;
    const hi = 2000;
    for (let i = 0; i < 30; i++) {
      const k = betweenKey(lo, hi);
      expect(k).toBeGreaterThan(lo);
      expect(k).toBeLessThan(hi);
      lo = k;
    }
  });
});
