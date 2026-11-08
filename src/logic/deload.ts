import type { Session, SessionEntry, Settings } from '../db/types';
import { weekStart } from '../lib/dates';
import { round2 } from '../lib/format';

/** Tygodnie treningowe = tygodnie kalendarzowe (pon–nd) z co najmniej jednym zakończonym treningiem. */
export function trainingWeeks(sessions: Session[]): string[] {
  return [...new Set(sessions.filter((s) => s.status === 'done').map((s) => weekStart(s.date)))].sort();
}

/**
 * Poniedziałek ostatniego lżejszego tygodnia – z ustawień lub z historii (treningi oznaczone jako lżejsze),
 * żeby licznik działał także po imporcie kopii zapasowej.
 */
export function lastDeloadWeek(sessions: Session[], settingsWeek?: string): string | undefined {
  const fromHistory = sessions.filter((s) => s.isDeload).map((s) => weekStart(s.date));
  const all = [...fromHistory, ...(settingsWeek ? [settingsWeek] : [])].sort();
  return all[all.length - 1];
}

export interface DeloadStatus {
  /** Liczba zakończonych tygodni treningowych od ostatniego lżejszego (bez bieżącego tygodnia). */
  weeksSinceDeload: number;
  /** Który to tydzień treningowy w bieżącym cyklu (bieżący tydzień = weeksSinceDeload + 1). */
  currentWeekNumber: number;
  /** Bieżący tydzień jest oznaczony jako lżejszy. */
  activeThisWeek: boolean;
  /** Czas na lżejszy tydzień i przypomnienie nie zostało odłożone. */
  shouldRemind: boolean;
  due: boolean;
}

export function deloadStatus(
  sessions: Session[],
  settings: Pick<Settings, 'deloadEveryWeeks' | 'lastDeloadWeekStart' | 'deloadDismissedWeek'>,
  today: string,
): DeloadStatus {
  const current = weekStart(today);
  const last = lastDeloadWeek(sessions, settings.lastDeloadWeekStart);
  const activeThisWeek = last === current;
  const weeksSinceDeload = trainingWeeks(sessions).filter((w) => w < current && (!last || w > last)).length;
  const due = !activeThisWeek && weeksSinceDeload >= settings.deloadEveryWeeks;
  return {
    weeksSinceDeload,
    currentWeekNumber: weeksSinceDeload + 1,
    activeThisWeek,
    due,
    shouldRemind: due && settings.deloadDismissedWeek !== current,
  };
}

/** Ciężar w lżejszym tygodniu: % zwykłego, zaokrąglony w dół do kroku ćwiczenia. Ciężary ≤ 0 (asysta) bez zmian. */
export function deloadWeight(weight: number | null, pct: number, step: number): number | null {
  if (weight == null || weight <= 0) return weight;
  const raw = (weight * pct) / 100;
  const s = step > 0 ? step : 0.5;
  return round2(Math.max(s, Math.floor(raw / s + 1e-9) * s));
}

/** Zamienia przygotowany wpis treningu na wersję lżejszą: mniej serii i mniejszy ciężar. */
export function applyDeload(entry: SessionEntry, opts: { setDelta: number; weightPct: number; step: number }): SessionEntry {
  const sets = Math.max(1, entry.sets - opts.setDelta);
  return {
    ...entry,
    sets,
    setLogs: entry.setLogs.slice(0, sets).map((s) => ({ ...s, weight: deloadWeight(s.weight, opts.weightPct, opts.step) })),
  };
}

/** Oznacza nowy trening jako lżejszy i zmniejsza serie/ciężary wg ustawień. */
export function toDeloadSession(
  session: Session,
  stepFor: (exerciseId: string) => number,
  settings: Pick<Settings, 'deloadSetDelta' | 'deloadWeightPct'>,
): Session {
  return {
    ...session,
    isDeload: true,
    entries: session.entries.map((e) =>
      applyDeload(e, { setDelta: settings.deloadSetDelta, weightPct: settings.deloadWeightPct, step: stepFor(e.exerciseId) }),
    ),
  };
}
