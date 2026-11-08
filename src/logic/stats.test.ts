import { describe, expect, it } from 'vitest';
import type { Session, SessionEntry, SetLog } from '../db/types';
import { epley1RM, exerciseSeries, exercisesWithHistory, sessionVolume, weeklyStats } from './stats';
import { weekStart } from '../lib/dates';

const set = (weight: number, reps: number, done = true): SetLog => ({ weight, reps, done });
const entry = (exerciseId: string, setLogs: SetLog[]): SessionEntry => ({ id: exerciseId, exerciseId, altExerciseIds: [], sets: 3, repMin: 6, repMax: 8, setLogs });
const session = (id: string, date: string, entries: SessionEntry[], extra: Partial<Session> = {}): Session => ({
  id,
  date,
  startedAt: 0,
  templateId: null,
  templateName: 'x',
  isDeload: false,
  note: '',
  cardio: { planned: false, done: false },
  status: 'done',
  entries,
  ...extra,
});

describe('epley1RM', () => {
  it('liczy wg wzoru Epleya', () => {
    expect(epley1RM(100, 10)).toBe(133.3);
    expect(epley1RM(60, 8)).toBe(76);
  });
  it('dla 1 powtórzenia zwraca ciężar', () => {
    expect(epley1RM(120, 1)).toBe(120);
  });
  it('dla ciężaru ≤ 0 (bez obciążenia / asysta) zwraca null', () => {
    expect(epley1RM(0, 10)).toBeNull();
    expect(epley1RM(-20, 8)).toBeNull();
  });
});

describe('exerciseSeries', () => {
  const sessions = [
    session('b', '2026-11-05', [entry('press', [set(62.5, 8), set(62.5, 7)])]),
    session('a', '2026-11-02', [entry('press', [set(60, 8), set(60, 8)]), entry('row', [set(50, 10)])]),
    session('c', '2026-11-09', [entry('press', [set(65, 5, false)])]),
    session('d', '2026-11-10', [entry('press', [set(70, 6)])], { status: 'in_progress' }),
  ];

  it('zwraca punkty od najstarszego, tylko z zatwierdzonymi seriami i zakończonych treningów', () => {
    const pts = exerciseSeries(sessions, 'press');
    expect(pts.map((p) => p.sessionId)).toEqual(['a', 'b']);
    expect(pts[1].bestWeight).toBe(62.5);
    expect(pts[1].bestE1RM).toBe(epley1RM(62.5, 8));
  });

  it('lista ćwiczeń z historią – ostatnio wykonywane pierwsze', () => {
    expect(exercisesWithHistory(sessions)).toEqual([
      { exerciseId: 'press', sessions: 2, lastDate: '2026-11-05' },
      { exerciseId: 'row', sessions: 1, lastDate: '2026-11-02' },
    ]);
  });
});

describe('weeklyStats', () => {
  it('liczy treningi, serie i tonaż w tygodniach pon–nd', () => {
    const sessions = [
      session('1', '2026-11-02', [entry('a', [set(50, 10), set(50, 10), set(0, 12)])]), // pon
      session('2', '2026-11-08', [entry('a', [set(20, 10), set(20, 10, false)])]), // nd – ten sam tydzień
      session('3', '2026-11-09', [entry('a', [set(10, 10)])]), // pon – następny tydzień
      session('4', '2026-10-01', [entry('a', [set(10, 10)])]), // poza zakresem
    ];
    const w = weeklyStats(sessions, 3, '2026-11-11');
    expect(w.map((x) => x.weekStart)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(w[1]).toEqual({ weekStart: '2026-11-02', workouts: 2, sets: 4, volume: 1200 });
    expect(w[2]).toMatchObject({ workouts: 1, sets: 1, volume: 100 });
    expect(w[0].workouts).toBe(0);
  });

  it('weekStart: niedziela należy do tygodnia rozpoczętego w poniedziałek', () => {
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });

  it('sessionVolume pomija niezatwierdzone serie', () => {
    expect(sessionVolume(session('x', '2026-11-02', [entry('a', [set(50, 10), set(50, 10, false)])]))).toBe(500);
  });
});
