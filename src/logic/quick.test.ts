import { describe, expect, it } from 'vitest';
import type { Session, SessionEntry } from '../db/types';
import { applyQuickRows, rowsFromSession } from './quick';
import { findPrevious, startingWeight } from './workout';
import { exerciseSeries, sessionExerciseCount, sessionVolume, weeklyStats } from './stats';
import { fmtSets } from '../lib/format';

const entry = (id: string, exerciseId: string, weight: number | null, alts: string[] = []): SessionEntry => ({
  id,
  exerciseId,
  altExerciseIds: alts,
  sets: 3,
  repMin: 6,
  repMax: 8,
  setLogs: [0, 1, 2].map(() => ({ weight, reps: null, done: false })),
});

const draft: Session = {
  id: 's1',
  date: '2026-11-09',
  startedAt: 0,
  templateId: 'upper-a',
  templateName: 'Góra A',
  isDeload: false,
  note: '',
  cardio: { planned: true, done: false, minutes: 20 },
  status: 'in_progress',
  entries: [entry('e1', 'hammer-chest-press', 72.5), entry('e2', 'pull-up', null, ['lat-pulldown']), entry('e3', 'curl', 12)],
};

describe('szybki zapis treningu', () => {
  it('szkic: ciężary z wypełnienia, wszystko zaznaczone jako zrobione', () => {
    expect(rowsFromSession(draft, true)).toEqual([
      { entryId: 'e1', exerciseId: 'hammer-chest-press', weight: 72.5, done: true },
      { entryId: 'e2', exerciseId: 'pull-up', weight: null, done: true },
      { entryId: 'e3', exerciseId: 'curl', weight: 12, done: true },
    ]);
  });

  it('zapis: zrobione ćwiczenie = serie z planu z jednym ciężarem i bez powtórzeń; pominięte = brak serii', () => {
    const rows = rowsFromSession(draft, true);
    rows[0].weight = 75;
    rows[1] = { ...rows[1], exerciseId: 'lat-pulldown', weight: 60 };
    rows[2].done = false;
    const saved = applyQuickRows({ ...draft, quick: true, status: 'done' }, rows);

    expect(saved.entries[0].setLogs).toEqual([0, 1, 2].map(() => ({ weight: 75, reps: null, done: true })));
    expect(saved.entries[1]).toMatchObject({ exerciseId: 'lat-pulldown', altExerciseIds: ['pull-up'] });
    expect(saved.entries[2].setLogs).toEqual([{ weight: 12, reps: null, done: false }]);
    expect(sessionExerciseCount(saved)).toBe(2);
    expect(sessionVolume(saved)).toBe(0); // brak powtórzeń = brak tonażu

    // odczyt do poprawiania daje te same wiersze
    expect(rowsFromSession(saved, false)).toEqual([
      { entryId: 'e1', exerciseId: 'hammer-chest-press', weight: 75, done: true },
      { entryId: 'e2', exerciseId: 'lat-pulldown', weight: 60, done: true },
      { entryId: 'e3', exerciseId: 'curl', weight: 12, done: false },
    ]);
  });

  it('pusty ciężar zrobionego ćwiczenia zapisuje się jako 0 (bez obciążenia)', () => {
    const rows = rowsFromSession(draft, true);
    const saved = applyQuickRows({ ...draft, quick: true, status: 'done' }, rows);
    expect(saved.entries[1].setLogs[0]).toEqual({ weight: 0, reps: null, done: true });
  });

  it('szybki zapis jest „poprzednim wynikiem”, liczy się w statystykach i na wykresie', () => {
    const rows = rowsFromSession(draft, true);
    const saved = applyQuickRows({ ...draft, quick: true, status: 'done', finishedAt: 1 }, rows);
    const prev = findPrevious([saved], 'hammer-chest-press', 'upper-a');
    expect(prev?.session.id).toBe('s1');
    expect(startingWeight(undefined, prev)).toBe(72.5);
    expect(exerciseSeries([saved], 'hammer-chest-press')[0]).toMatchObject({ bestWeight: 72.5, bestE1RM: null });
    expect(weeklyStats([saved], 1, '2026-11-09')[0]).toMatchObject({ workouts: 1, sets: 9, volume: 0 });
  });

  it('poprawka szczegółowego treningu bez zmian nie rusza serii z powtórzeniami', () => {
    const detailed: Session = {
      ...draft,
      status: 'done',
      entries: [{ ...entry('e1', 'hammer-chest-press', null), setLogs: [{ weight: 80, reps: 8, done: true }, { weight: 80, reps: 7, done: true }] }],
    };
    const out = applyQuickRows(detailed, rowsFromSession(detailed, false));
    expect(out.entries[0].setLogs).toEqual(detailed.entries[0].setLogs);
  });
});

describe('fmtSets', () => {
  it('grupuje jednakowe ciężary bez powtórzeń', () => {
    expect(fmtSets([{ weight: 72.5, reps: null }, { weight: 72.5, reps: null }, { weight: 72.5, reps: null }])).toBe('72,5 kg');
    expect(fmtSets([{ weight: 70, reps: null }, { weight: 70, reps: null }, { weight: 72.5, reps: null }])).toBe('2 × 70 kg · 1 × 72,5 kg');
    expect(fmtSets([{ weight: 0, reps: null }])).toBe('bez obciążenia');
  });

  it('pełne serie pokazuje jako ciężar×powtórzenia', () => {
    expect(fmtSets([{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }])).toBe('80×8 · 80×7');
  });
});
