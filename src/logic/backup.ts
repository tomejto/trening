import type { GymDB } from '../db/db';
import type { BodyWeight, Exercise, Session, Settings, WorkoutTemplate } from '../db/types';
import { DEFAULT_SETTINGS } from '../db/seed';

/** Wersja formatu pliku kopii (nie wersja bazy). Zwiększ przy niezgodnej zmianie struktury. */
export const BACKUP_FORMAT = 1;

export interface BackupData {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: Session[];
  bodyWeights: BodyWeight[];
  settings: Settings[];
}

export interface BackupFile {
  app: 'gymtracker';
  format: number;
  exportedAt: string;
  data: BackupData;
}

export class BackupError extends Error {}

export async function exportData(db: GymDB, now: Date = new Date()): Promise<BackupFile> {
  return db.transaction('r', [db.exercises, db.templates, db.sessions, db.bodyWeights, db.settings], async () => ({
    app: 'gymtracker' as const,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    data: {
      exercises: await db.exercises.toArray(),
      templates: await db.templates.toArray(),
      sessions: await db.sessions.toArray(),
      bodyWeights: await db.bodyWeights.toArray(),
      settings: await db.settings.toArray(),
    },
  }));
}

export function backupFileName(now: Date = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `trening-kopia-${d}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function checkArray<T>(data: Record<string, unknown>, key: string, valid: (x: Record<string, unknown>) => boolean): T[] {
  const arr = data[key];
  if (arr === undefined) return [];
  if (!Array.isArray(arr)) throw new BackupError(`Uszkodzona kopia: pole „${key}” nie jest listą.`);
  arr.forEach((x, i) => {
    if (!isObj(x) || !valid(x)) throw new BackupError(`Uszkodzona kopia: nieprawidłowy wpis ${i + 1} w „${key}”.`);
  });
  return arr as T[];
}

/** Odczytuje i sprawdza plik kopii. Rzuca BackupError z komunikatem po polsku. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('To nie jest poprawny plik JSON.');
  }
  if (!isObj(raw) || raw.app !== 'gymtracker' || !isObj(raw.data)) throw new BackupError('To nie jest kopia zapasowa tej aplikacji.');
  if (typeof raw.format !== 'number' || raw.format > BACKUP_FORMAT)
    throw new BackupError('Kopia pochodzi z nowszej wersji aplikacji – najpierw zaktualizuj aplikację.');

  const d = raw.data;
  const data: BackupData = {
    exercises: checkArray<Exercise>(d, 'exercises', (x) => isStr(x.id) && typeof x.name === 'string'),
    templates: checkArray<WorkoutTemplate>(d, 'templates', (x) => isStr(x.id) && Array.isArray(x.items)),
    sessions: checkArray<Session>(d, 'sessions', (x) => isStr(x.id) && isDate(x.date) && Array.isArray(x.entries)),
    bodyWeights: checkArray<BodyWeight>(d, 'bodyWeights', (x) => isStr(x.id) && isDate(x.date) && typeof x.kg === 'number'),
    settings: checkArray<Settings>(d, 'settings', (x) => x.id === 'settings'),
  };
  if (data.exercises.length === 0 && data.sessions.length === 0) throw new BackupError('Kopia jest pusta.');

  // Wpisy historii muszą wskazywać istniejące ćwiczenia – inaczej historia straciłaby nazwy.
  const exIds = new Set(data.exercises.map((e) => e.id));
  const missing = data.sessions.flatMap((s) => s.entries.map((e) => e.exerciseId)).find((id) => !exIds.has(id));
  if (missing) throw new BackupError(`Uszkodzona kopia: historia odwołuje się do nieistniejącego ćwiczenia (${missing}).`);

  return { app: 'gymtracker', format: raw.format, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '', data };
}

export function summarizeBackup(file: BackupFile) {
  const done = file.data.sessions.filter((s) => s.status === 'done');
  const dates = done.map((s) => s.date).sort();
  return {
    sessions: done.length,
    exercises: file.data.exercises.length,
    templates: file.data.templates.length,
    bodyWeights: file.data.bodyWeights.length,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
  };
}

/** Zastępuje wszystkie dane zawartością kopii (w jednej transakcji – przy błędzie nic się nie zmienia). */
export async function importData(db: GymDB, file: BackupFile): Promise<void> {
  const { data } = file;
  await db.transaction('rw', [db.exercises, db.templates, db.sessions, db.bodyWeights, db.settings], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.sessions.clear(), db.bodyWeights.clear(), db.settings.clear()]);
    await db.exercises.bulkPut(data.exercises);
    await db.templates.bulkPut(data.templates);
    await db.sessions.bulkPut(data.sessions);
    await db.bodyWeights.bulkPut(data.bodyWeights);
    await db.settings.put({ ...DEFAULT_SETTINGS, ...(data.settings[0] ?? {}), id: 'settings' });
  });
}
