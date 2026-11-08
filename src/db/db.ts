import Dexie, { type EntityTable } from 'dexie';
import type { BodyWeight, Exercise, Session, Settings, WorkoutTemplate } from './types';
import { DEFAULT_SETTINGS, SEED_EXERCISES, SEED_TEMPLATES, SEED_VERSION } from './seed';
import { DESCRIPTIONS } from './descriptions';

function isEmptyDescription(d: Exercise['description'] | undefined): boolean {
  return !d || (!d.muscles && !d.setup && d.steps.length === 0 && d.mistakes.length === 0 && d.tips.length === 0);
}

export class GymDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  templates!: EntityTable<WorkoutTemplate, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  bodyWeights!: EntityTable<BodyWeight, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'gymtracker') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name',
      templates: 'id, order, weekday',
      sessions: 'id, date, status, templateId',
      bodyWeights: 'id, date',
      settings: 'id',
    });

    // v2: opisy ćwiczeń startowych dla baz utworzonych w etapie 1 (nie nadpisuje własnych opisów).
    this.version(2).upgrade(async (tx) => {
      await tx
        .table('exercises')
        .toCollection()
        .modify((ex: Exercise) => {
          if (isEmptyDescription(ex.description) && DESCRIPTIONS[ex.id]) ex.description = DESCRIPTIONS[ex.id];
        });
      await tx
        .table('settings')
        .toCollection()
        .modify((s: Settings) => {
          s.seedVersion = SEED_VERSION;
        });
    });

    // Dane startowe przy pierwszym uruchomieniu.
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(SEED_EXERCISES);
      tx.table('templates').bulkAdd(SEED_TEMPLATES);
      tx.table('settings').add(DEFAULT_SETTINGS);
    });
  }
}

export const db = new GymDB();

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) };
}
