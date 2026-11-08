import { describe, expect, it } from 'vitest';
import { movingAverage, weeklyRate } from './bodyweight';

const bw = (date: string, kg: number) => ({ id: date, date, kg });

describe('masa ciała', () => {
  it('średnia 7-dniowa z pomiarów w oknie', () => {
    const avg = movingAverage([bw('2026-11-01', 80), bw('2026-11-03', 81), bw('2026-11-08', 82), bw('2026-11-09', 79)]);
    expect(avg.map((a) => a.value)).toEqual([80, 80.5, 81.5, 80.67]);
  });

  it('tempo: spadek 0,5 kg/tydz.', () => {
    const entries = [bw('2026-10-18', 82), bw('2026-10-25', 81.5), bw('2026-11-01', 81), bw('2026-11-08', 80.5)];
    expect(weeklyRate(entries, '2026-11-08')).toBe(-0.5);
  });

  it('tempo bierze tylko ostatnie 4 tygodnie', () => {
    const entries = [bw('2026-08-01', 90), bw('2026-10-25', 80), bw('2026-11-01', 80.25), bw('2026-11-08', 80.5)];
    expect(weeklyRate(entries, '2026-11-08')).toBe(0.25);
  });

  it('za mało danych → brak tempa', () => {
    expect(weeklyRate([bw('2026-11-01', 80), bw('2026-11-08', 81)], '2026-11-08')).toBeNull();
    expect(weeklyRate([bw('2026-11-06', 80), bw('2026-11-07', 81), bw('2026-11-08', 81)], '2026-11-08')).toBeNull();
  });
});
