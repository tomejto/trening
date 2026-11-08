import type { Session, SessionEntry } from '../db/types';
import { doneSets } from './workout';

/** Wiersz szybkiego zapisu: jedno ćwiczenie = wybrany wariant, ciężar i czy zostało zrobione. */
export interface QuickRow {
  entryId: string;
  exerciseId: string;
  weight: number | null;
  done: boolean;
}

/** Wszystkie warianty wpisu (główne + alternatywy). */
export const entryOptions = (e: SessionEntry) => [e.exerciseId, ...e.altExerciseIds];

/**
 * Wiersze z treningu.
 * - szkic (nowy trening): ciężar z wypełnienia (ostatni wynik / ciężar roboczy), wszystko zaznaczone jako zrobione,
 * - zapisany trening: najwyższy zrobiony ciężar; ćwiczenie bez zrobionych serii = pominięte.
 */
export function rowsFromSession(session: Session, draft: boolean): QuickRow[] {
  return session.entries.map((e) => {
    if (draft) return { entryId: e.id, exerciseId: e.exerciseId, weight: e.setLogs.find((s) => s.weight != null)?.weight ?? null, done: true };
    const done = doneSets(e);
    return {
      entryId: e.id,
      exerciseId: e.exerciseId,
      weight: done.length ? Math.max(...done.map((s) => s.weight as number)) : (e.setLogs[0]?.weight ?? null),
      done: done.length > 0,
    };
  });
}

/**
 * Zapisuje wiersze do treningu. Zrobione ćwiczenie dostaje tyle serii, ile było w planie, z tym ciężarem
 * i bez powtórzeń. Jeśli w szczegółowym treningu ciężar się nie zmienił, serie zostają nietknięte.
 */
export function applyQuickRows(session: Session, rows: QuickRow[]): Session {
  const byId = new Map(rows.map((r) => [r.entryId, r]));
  return {
    ...session,
    entries: session.entries.map((e) => {
      const row = byId.get(e.id);
      if (!row) return e;
      const options = entryOptions(e);
      const exerciseId = options.includes(row.exerciseId) ? row.exerciseId : e.exerciseId;
      const altExerciseIds = options.filter((id) => id !== exerciseId);
      const before = rowsFromSession({ ...session, entries: [e] }, false)[0];
      const unchanged = !session.quick && exerciseId === e.exerciseId && row.done === before.done && row.weight === before.weight;
      if (unchanged) return e;
      return {
        ...e,
        exerciseId,
        altExerciseIds,
        // pominięte: jedna niezrobiona seria – ciężar zostaje na wypadek poprawki
        setLogs: row.done
          ? Array.from({ length: Math.max(1, e.sets) }, () => ({ weight: row.weight ?? 0, reps: null, done: true }))
          : [{ weight: row.weight, reps: null, done: false }],
      };
    }),
  };
}
