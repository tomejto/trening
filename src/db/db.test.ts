import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { GymDB } from './db';
import { DESCRIPTIONS } from './descriptions';
import { SEED_EXERCISES, SEED_VERSION } from './seed';

const empty = { muscles: '', setup: '', steps: [], mistakes: [], tips: [] };

describe('baza danych', () => {
  it('nowa baza dostaje plan startowy z opisami', async () => {
    const db = new GymDB('test-fresh');
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length);
    expect(await db.templates.count()).toBe(4);
    const ex = await db.exercises.get('hammer-chest-press');
    expect(ex?.description.steps.length).toBeGreaterThan(0);
    expect((await db.settings.get('settings'))?.seedVersion).toBe(SEED_VERSION);
    db.close();
  });

  it('migracja v1 → v2 uzupełnia puste opisy i nie rusza własnych', async () => {
    // Baza w wersji z etapu 1: ćwiczenia bez opisów.
    const v1 = new Dexie('test-migrate');
    v1.version(1).stores({ exercises: 'id, name', templates: 'id, order, weekday', sessions: 'id, date, status, templateId', bodyWeights: 'id, date', settings: 'id' });
    await v1.table('exercises').bulkAdd([
      { ...SEED_EXERCISES[0], description: empty },
      { ...SEED_EXERCISES[1], description: { ...empty, muscles: 'mój opis' } },
      { id: 'custom', name: 'Własne', bodyPart: 'upper', kind: 'isolation', unilateral: false, weightStep: 2.5, description: empty, userNotes: '' },
    ]);
    await v1.table('settings').add({ id: 'settings', seedVersion: 1 });
    await v1.table('sessions').add({ id: 's1', date: '2026-11-02', status: 'done', entries: [] });
    v1.close();

    const db = new GymDB('test-migrate');
    expect((await db.exercises.get(SEED_EXERCISES[0].id))?.description).toEqual(DESCRIPTIONS[SEED_EXERCISES[0].id]);
    expect((await db.exercises.get(SEED_EXERCISES[1].id))?.description.muscles).toBe('mój opis');
    expect((await db.exercises.get('custom'))?.description).toEqual(empty);
    expect((await db.settings.get('settings'))?.seedVersion).toBe(SEED_VERSION);
    expect(await db.sessions.count()).toBe(1);
    db.close();
  });

  it('migracja v2 → v3 zamienia bułgary i ławkę rzymską w planie, historia zostaje', async () => {
    const v2 = new Dexie('test-migrate-v3');
    v2.version(1).stores({ exercises: 'id, name', templates: 'id, order, weekday', sessions: 'id, date, status, templateId', bodyWeights: 'id, date', settings: 'id' });
    v2.version(2).stores({});
    const old = (id: string) => ({ ...SEED_EXERCISES.find((e) => e.id === id)!, archived: undefined, userNotes: 'moje' });
    await v2.table('exercises').bulkAdd([old('bulgarian-split-squat'), old('back-extension'), old('seated-leg-curl')]);
    await v2.table('templates').bulkAdd([
      {
        id: 'lower-a',
        name: 'Dół A',
        items: [
          { id: 'i1', exerciseId: 'bulgarian-split-squat', altExerciseIds: [], sets: 4, repMin: 6, repMax: 8 },
          { id: 'i2', exerciseId: 'seated-leg-curl', altExerciseIds: ['back-extension'], sets: 3, repMin: 8, repMax: 10 },
        ],
      },
      { id: 'lower-b', name: 'Dół B', items: [{ id: 'i3', exerciseId: 'back-extension', altExerciseIds: ['hip-thrust'], sets: 3, repMin: 12, repMax: 15 }] },
    ]);
    await v2.table('settings').add({ id: 'settings', seedVersion: 2 });
    await v2.table('sessions').add({ id: 's1', date: '2026-11-03', status: 'done', entries: [{ id: 'e', exerciseId: 'bulgarian-split-squat', altExerciseIds: [], setLogs: [] }] });
    v2.close();

    const db = new GymDB('test-migrate-v3');
    const a = await db.templates.get('lower-a');
    const b = await db.templates.get('lower-b');
    // zamiana z zachowaniem serii i zakresu powtórzeń użytkownika
    expect(a?.items[0]).toMatchObject({ exerciseId: 'leg-press', sets: 4, repMin: 6, repMax: 8 });
    expect(a?.items[1]).toMatchObject({ exerciseId: 'seated-leg-curl', altExerciseIds: ['hip-thrust'] });
    // alternatywa równa nowemu ćwiczeniu nie dubluje się
    expect(b?.items[0]).toMatchObject({ exerciseId: 'hip-thrust', altExerciseIds: [] });
    // nowe ćwiczenia z opisem, stare ukryte, ale z notatkami
    expect((await db.exercises.get('leg-press'))?.description.steps.length).toBeGreaterThan(0);
    expect(await db.exercises.get('hip-thrust')).toBeDefined();
    expect(await db.exercises.get('bulgarian-split-squat')).toMatchObject({ archived: true, userNotes: 'moje' });
    expect((await db.exercises.get('seated-leg-curl'))?.archived).toBeUndefined();
    // historia bez zmian
    expect((await db.sessions.get('s1'))?.entries[0].exerciseId).toBe('bulgarian-split-squat');
    expect((await db.settings.get('settings'))?.seedVersion).toBe(3);
    db.close();
  });

  it('nowa baza: Dół A i Dół B bez bułgarów i ławki rzymskiej', async () => {
    const db = new GymDB('test-fresh-v3');
    const ids = (await db.templates.toArray()).flatMap((t) => t.items.flatMap((i) => [i.exerciseId, ...i.altExerciseIds]));
    expect(ids).not.toContain('bulgarian-split-squat');
    expect(ids).not.toContain('back-extension');
    expect(ids).toContain('leg-press');
    expect(ids).toContain('hip-thrust');
    expect((await db.exercises.get('back-extension'))?.archived).toBe(true);
    db.close();
  });

  it('każde ćwiczenie startowe ma kompletny opis', () => {
    for (const ex of SEED_EXERCISES) {
      const d = DESCRIPTIONS[ex.id];
      expect(d, ex.id).toBeDefined();
      expect(d.muscles && d.setup && d.steps.length && d.mistakes.length && d.tips.length, ex.id).toBeTruthy();
    }
  });
});
