import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Exercise } from './types';
import { DEFAULT_SETTINGS } from './seed';

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(() => db.exercises.toArray());
}

export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])));
}

export function useTemplates() {
  return useLiveQuery(() => db.templates.orderBy('order').toArray());
}

export function useSessions() {
  return useLiveQuery(() => db.sessions.toArray());
}

export function useSettings() {
  // Domyślne wartości uzupełniają pola dodane w późniejszych wersjach aplikacji.
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) }));
}
