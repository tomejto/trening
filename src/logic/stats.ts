import type { Session, SetLog } from '../db/types';
import { parseISODate, toISODate, weekStart } from '../lib/dates';
import { round2 } from '../lib/format';
import { doneSets } from './workout';

/** Szacowany 1RM wzorem Epleya: ciężar × (1 + powtórzenia / 30). Dla 1 powtórzenia = ciężar. */
export function epley1RM(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export interface ExercisePoint {
  date: string;
  sessionId: string;
  isDeload: boolean;
  bestWeight: number;
  bestE1RM: number | null;
  sets: SetLog[];
}

/** Przebieg ćwiczenia w czasie (najstarsze → najnowsze), tylko zakończone treningi z zatwierdzonymi seriami. */
export function exerciseSeries(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  const sorted = sessions
    .filter((s) => s.status === 'done')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt);
  for (const s of sorted) {
    const sets = s.entries.filter((e) => e.exerciseId === exerciseId).flatMap(doneSets);
    if (sets.length === 0) continue;
    const e1rms = sets.map((x) => (x.reps == null ? null : epley1RM(x.weight as number, x.reps))).filter((v): v is number => v != null);
    points.push({
      date: s.date,
      sessionId: s.id,
      isDeload: s.isDeload,
      bestWeight: Math.max(...sets.map((x) => x.weight as number)),
      bestE1RM: e1rms.length ? Math.max(...e1rms) : null,
      sets,
    });
  }
  return points;
}

export interface ExerciseSummary {
  exerciseId: string;
  sessions: number;
  lastDate: string;
}

/** Ćwiczenia, które mają jakąkolwiek historię – najpierw ostatnio wykonywane. */
export function exercisesWithHistory(sessions: Session[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    const seen = new Set<string>();
    for (const e of s.entries) {
      if (doneSets(e).length === 0 || seen.has(e.exerciseId)) continue;
      seen.add(e.exerciseId);
      const cur = map.get(e.exerciseId);
      if (!cur) map.set(e.exerciseId, { exerciseId: e.exerciseId, sessions: 1, lastDate: s.date });
      else {
        cur.sessions++;
        if (s.date > cur.lastDate) cur.lastDate = s.date;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

export interface WeekStats {
  weekStart: string;
  workouts: number;
  sets: number;
  /** Tonaż: suma ciężar × powtórzenia (tylko dodatnie ciężary). */
  volume: number;
}

/** Statystyki ostatnich `weeks` tygodni (pon–nd), od najstarszego; ostatni element = bieżący tydzień. */
export function weeklyStats(sessions: Session[], weeks: number, today: string): WeekStats[] {
  const current = parseISODate(weekStart(today));
  const result: WeekStats[] = [];
  const index = new Map<string, WeekStats>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(d.getDate() - i * 7);
    const ws: WeekStats = { weekStart: toISODate(d), workouts: 0, sets: 0, volume: 0 };
    result.push(ws);
    index.set(ws.weekStart, ws);
  }
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    const w = index.get(weekStart(s.date));
    if (!w) continue;
    w.workouts++;
    for (const e of s.entries) {
      for (const set of doneSets(e)) {
        w.sets++;
        w.volume += setVolume(set);
      }
    }
  }
  for (const w of result) w.volume = round2(w.volume);
  return result;
}

/** Ciężar × powtórzenia; 0 dla ujemnych ciężarów (asysta) i serii bez powtórzeń (szybki zapis). */
function setVolume(set: SetLog): number {
  return set.weight != null && set.weight > 0 && set.reps != null ? set.weight * set.reps : 0;
}

export function sessionSetCount(s: Session): number {
  return s.entries.reduce((n, e) => n + doneSets(e).length, 0);
}

export function sessionVolume(s: Session): number {
  return round2(
    s.entries.reduce((sum, e) => sum + doneSets(e).reduce((v, x) => v + setVolume(x), 0), 0),
  );
}

/** Liczba ćwiczeń z co najmniej jedną zrobioną serią. */
export function sessionExerciseCount(s: Session): number {
  return s.entries.filter((e) => doneSets(e).length > 0).length;
}
