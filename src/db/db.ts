import Dexie, { type EntityTable } from 'dexie';
import type { BodyWeight, Exercise, Session, Settings, WorkoutTemplate } from './types';
import { DEFAULT_SETTINGS, REPLACED_IN_V3, SEED_EXERCISES, SEED_TEMPLATES, SEED_VERSION } from './seed';
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

    // v3: przysiad bułgarski → suwnica, ławka rzymska → hip thrust w planie zapisanym na telefonie.
    // Nowe ćwiczenia są dodawane, stare zostają (historia), ale znikają z wyboru ćwiczeń.
    this.version(3).upgrade(async (tx) => {
      const exercises = tx.table('exercises');
      for (const [oldId, newId] of Object.entries(REPLACED_IN_V3)) {
        if (!(await exercises.get(newId))) await exercises.add(SEED_EXERCISES.find((e) => e.id === newId)!);
        await exercises.update(oldId, { archived: true });
      }
      const swap = (id: string) => REPLACED_IN_V3[id] ?? id;
      await tx
        .table('templates')
        .toCollection()
        .modify((t: WorkoutTemplate) => {
          t.items = t.items.map((it) => {
            const exerciseId = swap(it.exerciseId);
            const altExerciseIds = [...new Set(it.altExerciseIds.map(swap))].filter((id) => id !== exerciseId);
            return { ...it, exerciseId, altExerciseIds };
          });
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
