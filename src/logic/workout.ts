import type { Exercise, Session, SessionEntry, SetLog, WorkoutTemplate } from '../db/types';
import { newId } from '../lib/ids';
import { round2 } from '../lib/format';

export interface PreviousResult {
  session: Session;
  entry: SessionEntry;
}

/** Zatwierdzone serie z kompletem danych. */
/** Zrobione serie z ciężarem. Przy szybkim zapisie powtórzenia są puste (reps = null). */
export function doneSets(entry: SessionEntry): SetLog[] {
  return entry.setLogs.filter((s) => s.done && s.weight != null);
}

/**
 * Ostatni wynik danego ćwiczenia (po identyfikatorze, nie po pozycji w planie).
 * - bierze tylko zakończone, normalne (nie lżejsze) treningi,
 * - preferuje ten sam trening z planu (np. uginanie nóg w Dole A vs Dole B ma inne zakresy),
 *   a gdy go brak – dowolny trening z tym ćwiczeniem.
 */
export function findPrevious(
  sessions: Session[],
  exerciseId: string,
  templateId: string | null,
  excludeSessionId?: string,
): PreviousResult | undefined {
  const candidates = sessions
    .filter((s) => s.status === 'done' && !s.isDeload && s.id !== excludeSessionId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt);

  let fallback: PreviousResult | undefined;
  for (const session of candidates) {
    const entry = session.entries.find((e) => e.exerciseId === exerciseId && doneSets(e).length > 0);
    if (!entry) continue;
    if (templateId != null && session.templateId === templateId) return { session, entry };
    fallback ??= { session, entry };
    if (templateId == null) return fallback;
  }
  return fallback;
}

/**
 * Podwójna progresja: jeśli w poprzednim treningu wszystkie zaplanowane serie
 * osiągnęły górną granicę zakresu, zwraca nowy ciężar (+ krok ćwiczenia). W przeciwnym razie null.
 */
export function progressionSuggestion(
  prev: SessionEntry | undefined,
  target: { sets: number; repMax: number },
  weightStep: number,
): number | null {
  if (!prev) return null;
  const sets = doneSets(prev);
  if (sets.length === 0 || sets.length < target.sets) return null;
  if (!sets.every((s) => s.reps != null && s.reps >= target.repMax)) return null;
  const base = Math.max(...sets.map((s) => s.weight as number));
  return round2(base + weightStep);
}

type WorkingWeight = Pick<Exercise, 'workingWeight' | 'workingWeightAt'>;

/**
 * Ciężar roboczy z karty ćwiczenia, jeśli ma pierwszeństwo przed poprzednim wynikiem:
 * gdy nie ma historii albo gdy ustawiono go później niż ostatni trening z tym ćwiczeniem.
 */
export function workingWeightOverride(ex: WorkingWeight | undefined, prev: Pick<PreviousResult, 'session'> | undefined): number | null {
  if (ex?.workingWeight == null) return null;
  if (!prev) return ex.workingWeight;
  const prevAt = prev.session.finishedAt ?? prev.session.startedAt;
  return (ex.workingWeightAt ?? 0) > prevAt ? ex.workingWeight : null;
}

/** Ciężar, od którego zacznie się kolejny trening (do pokazania na liście ćwiczeń). */
export function startingWeight(ex: WorkingWeight | undefined, prev: PreviousResult | undefined): number | null {
  const override = workingWeightOverride(ex, prev);
  if (override != null) return override;
  const weights = (prev ? doneSets(prev.entry) : []).map((s) => s.weight).filter((w): w is number => w != null);
  return weights.length ? Math.max(...weights) : null;
}

/**
 * Wartości początkowe serii: z poprzedniego razu (seria po serii), a gdy brak – puste.
 * Ciężar roboczy (weightOverride) zastępuje ciężar we wszystkich seriach; powtórzenia zostają z poprzedniego razu.
 */
export function prefillSets(count: number, prev: SessionEntry | undefined, weightOverride: number | null = null): SetLog[] {
  const source = prev ? doneSets(prev) : [];
  return Array.from({ length: count }, (_, i) => {
    const s = source[i] ?? source[source.length - 1];
    return { weight: weightOverride ?? s?.weight ?? null, reps: s?.reps ?? null, done: false };
  });
}

export function buildEntry(
  base: Pick<SessionEntry, 'exerciseId' | 'altExerciseIds' | 'sets' | 'repMin' | 'repMax' | 'supersetWithNext' | 'note'>,
  sessions: Session[],
  templateId: string | null,
  exercise?: WorkingWeight,
): SessionEntry {
  const prev = findPrevious(sessions, base.exerciseId, templateId);
  return { id: newId(), ...base, setLogs: prefillSets(base.sets, prev?.entry, workingWeightOverride(exercise, prev)) };
}

export function createSessionFromTemplate(
  template: WorkoutTemplate,
  sessions: Session[],
  date: string,
  now: number = Date.now(),
  exercises?: Map<string, WorkingWeight>,
): Session {
  return {
    id: newId(),
    date,
    startedAt: now,
    templateId: template.id,
    templateName: template.name,
    isDeload: false,
    note: '',
    cardio: { planned: template.cardio.enabled, done: false, minutes: template.cardio.enabled ? template.cardio.minutes : undefined },
    status: 'in_progress',
    entries: template.items.map((it) =>
      buildEntry(
        {
          exerciseId: it.exerciseId,
          altExerciseIds: it.altExerciseIds,
          sets: it.sets,
          repMin: it.repMin,
          repMax: it.repMax,
          supersetWithNext: it.supersetWithNext,
          note: it.note,
        },
        sessions,
        template.id,
        exercises?.get(it.exerciseId),
      ),
    ),
  };
}

/** Grupuje kolejne wpisy połączone `supersetWithNext` (superserie). */
export function groupBySuperset<T extends { supersetWithNext?: boolean }>(items: T[]): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  items.forEach((it, i) => {
    current.push(it);
    const last = i === items.length - 1;
    if (!it.supersetWithNext || last) {
      groups.push(current);
      current = [];
    }
  });
  return groups;
}

/** Trening przypisany do dnia tygodnia (pierwszy wg kolejności). */
export function templateForWeekday(templates: WorkoutTemplate[], weekday: number): WorkoutTemplate | undefined {
  return [...templates].sort((a, b) => a.order - b.order).find((t) => t.weekday === weekday);
}

/**
 * Czy i jak długi timer uruchomić po zatwierdzeniu serii danego wpisu.
 * W superserii timer rusza dopiero po ostatnim ćwiczeniu z grupy (przerwa = najdłuższa z grupy).
 */
export function restAfterSet(
  entries: SessionEntry[],
  entryId: string,
  exercises: Map<string, Pick<Exercise, 'kind' | 'restSec'>>,
  settings: { restCompoundSec: number; restIsolationSec: number },
): number | null {
  const group = groupBySuperset(entries).find((g) => g.some((e) => e.id === entryId));
  if (!group) return null;
  if (group[group.length - 1].id !== entryId) return null;
  return Math.max(...group.map((e) => restSecondsFor(exercises.get(e.exerciseId), settings)));
}

export function restSecondsFor(
  exercise: Pick<Exercise, 'kind' | 'restSec'> | undefined,
  settings: { restCompoundSec: number; restIsolationSec: number },
): number {
  if (exercise?.restSec) return exercise.restSec;
  return exercise?.kind === 'compound' ? settings.restCompoundSec : settings.restIsolationSec;
}
