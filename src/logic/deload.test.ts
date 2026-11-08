import { describe, expect, it } from 'vitest';
import type { Session, SessionEntry } from '../db/types';
import { applyDeload, deloadStatus, deloadWeight, lastDeloadWeek, trainingWeeks } from './deload';

const session = (date: string, extra: Partial<Session> = {}): Session => ({
  id: date + (extra.isDeload ? 'd' : ''),
  date,
  startedAt: 0,
  templateId: null,
  templateName: 'x',
  isDeload: false,
  note: '',
  cardio: { planned: false, done: false },
  status: 'done',
  entries: [],
  ...extra,
});

const settings = { deloadEveryWeeks: 3 };

describe('trainingWeeks (liczenie tygodni treningowych)', () => {
  it('liczy tygodnie z co najmniej jednym zakończonym treningiem, każdy raz', () => {
    const s = [session('2026-11-02'), session('2026-11-05'), session('2026-11-08'), session('2026-11-10'), session('2026-11-17', { status: 'in_progress' })];
    expect(trainingWeeks(s)).toEqual(['2026-11-02', '2026-11-09']);
  });

  it('tydzień bez treningu nie jest liczony', () => {
    const s = [session('2026-10-19'), session('2026-11-02')];
    expect(trainingWeeks(s)).toHaveLength(2);
  });
});

describe('deloadStatus', () => {
  // Tygodnie: 12.10, 19.10, 26.10, 2.11 – dziś 11.11 (tydzień 9.11)
  const history = [session('2026-10-12'), session('2026-10-20'), session('2026-10-27'), session('2026-11-03')];

  it('liczy zakończone tygodnie bez bieżącego', () => {
    const st = deloadStatus(history, settings, '2026-11-11');
    expect(st.weeksSinceDeload).toBe(4);
    expect(st.currentWeekNumber).toBe(5);
  });

  it('trening w bieżącym tygodniu nie zmienia licznika do jego końca', () => {
    const st = deloadStatus([...history, session('2026-11-09')], settings, '2026-11-11');
    expect(st.weeksSinceDeload).toBe(4);
  });

  it('przypomina, gdy minęło ustawione minimum tygodni', () => {
    expect(deloadStatus(history.slice(0, 2), settings, '2026-11-11').due).toBe(false);
    expect(deloadStatus(history.slice(0, 3), settings, '2026-11-11').due).toBe(true);
  });

  it('liczy od ostatniego lżejszego tygodnia z historii', () => {
    const withDeload = [...history.slice(0, 2), session('2026-10-28', { isDeload: true }), session('2026-11-03')];
    const st = deloadStatus(withDeload, settings, '2026-11-11');
    expect(st.weeksSinceDeload).toBe(1);
    expect(st.due).toBe(false);
  });

  it('liczy od lżejszego tygodnia zapisanego w ustawieniach', () => {
    const st = deloadStatus(history, { ...settings, lastDeloadWeekStart: '2026-10-19' }, '2026-11-11');
    expect(st.weeksSinceDeload).toBe(2);
  });

  it('bieżący lżejszy tydzień: aktywny, bez przypomnienia', () => {
    const st = deloadStatus(history, { ...settings, lastDeloadWeekStart: '2026-11-09' }, '2026-11-11');
    expect(st.activeThisWeek).toBe(true);
    expect(st.shouldRemind).toBe(false);
  });

  it('odłożone przypomnienie wraca w kolejnym tygodniu', () => {
    const dismissed = { ...settings, deloadDismissedWeek: '2026-11-09' };
    expect(deloadStatus(history, dismissed, '2026-11-11').shouldRemind).toBe(false);
    expect(deloadStatus(history, dismissed, '2026-11-16').shouldRemind).toBe(true);
  });

  it('bez historii: tydzień 1, bez przypomnienia', () => {
    expect(deloadStatus([], settings, '2026-11-11')).toMatchObject({ weeksSinceDeload: 0, currentWeekNumber: 1, due: false });
  });

  it('lastDeloadWeek wybiera najnowszy z historii i ustawień', () => {
    expect(lastDeloadWeek([session('2026-10-28', { isDeload: true })], '2026-09-07')).toBe('2026-10-26');
    expect(lastDeloadWeek([], undefined)).toBeUndefined();
  });
});

describe('applyDeload', () => {
  it('deloadWeight: % ciężaru zaokrąglony w dół do kroku', () => {
    expect(deloadWeight(70, 90, 2.5)).toBe(62.5);
    expect(deloadWeight(100, 90, 5)).toBe(90);
    expect(deloadWeight(12, 90, 2.5)).toBe(10);
    expect(deloadWeight(null, 90, 2.5)).toBeNull();
    expect(deloadWeight(-20, 90, 2.5)).toBe(-20);
    expect(deloadWeight(2, 90, 2.5)).toBe(2.5); // nie schodzi do zera
  });

  it('zmniejsza liczbę serii i ciężar', () => {
    const e: SessionEntry = {
      id: 'e',
      exerciseId: 'x',
      altExerciseIds: [],
      sets: 3,
      repMin: 6,
      repMax: 8,
      setLogs: [
        { weight: 70, reps: 8, done: false },
        { weight: 70, reps: 8, done: false },
        { weight: 70, reps: 7, done: false },
      ],
    };
    const d = applyDeload(e, { setDelta: 1, weightPct: 90, step: 2.5 });
    expect(d.sets).toBe(2);
    expect(d.setLogs).toEqual([
      { weight: 62.5, reps: 8, done: false },
      { weight: 62.5, reps: 8, done: false },
    ]);
    expect(applyDeload({ ...e, sets: 1, setLogs: [e.setLogs[0]] }, { setDelta: 1, weightPct: 90, step: 2.5 }).sets).toBe(1);
  });
});
