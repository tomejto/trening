import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { GymDB } from '../db/db';
import type { Session } from '../db/types';
import { BackupError, backupFileName, exportData, importData, parseBackup, summarizeBackup } from './backup';

const session: Session = {
  id: 's1',
  date: '2026-11-02',
  startedAt: 1,
  finishedAt: 2,
  templateId: 'upper-a',
  templateName: 'Góra A',
  isDeload: false,
  note: 'dobrze',
  cardio: { planned: true, done: true, minutes: 20, type: 'Rower' },
  status: 'done',
  entries: [
    { id: 'e1', exerciseId: 'hammer-chest-press', altExerciseIds: [], sets: 3, repMin: 6, repMax: 8, setLogs: [{ weight: 72.5, reps: 8, done: true }] },
  ],
};

async function filledDb(name: string) {
  const db = new GymDB(name);
  await db.sessions.add(session);
  await db.bodyWeights.add({ id: 'b1', date: '2026-11-02', kg: 81.4 });
  await db.exercises.update('hammer-chest-press', { userNotes: 'siedzisko 4' });
  await db.settings.update('settings', { deloadEveryWeeks: 6 });
  return db;
}

async function dump(db: GymDB) {
  const sort = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
  return {
    exercises: sort(await db.exercises.toArray()),
    templates: sort(await db.templates.toArray()),
    sessions: sort(await db.sessions.toArray()),
    bodyWeights: sort(await db.bodyWeights.toArray()),
    settings: await db.settings.toArray(),
  };
}

describe('eksport i import kopii zapasowej', () => {
  it('eksport → JSON → import odtwarza wszystkie dane 1:1', async () => {
    const src = await filledDb('backup-src');
    const file = await exportData(src, new Date('2026-11-08T10:00:00Z'));
    const text = JSON.stringify(file);

    const dst = new GymDB('backup-dst');
    await dst.sessions.add({ ...session, id: 'stary' }); // dane, które mają zniknąć
    await importData(dst, parseBackup(text));

    expect(await dump(dst)).toEqual(await dump(src));
    expect(await dst.sessions.get('stary')).toBeUndefined();
    expect((await dst.exercises.get('hammer-chest-press'))?.userNotes).toBe('siedzisko 4');
    expect((await dst.settings.get('settings'))?.deloadEveryWeeks).toBe(6);
    src.close();
    dst.close();
  });

  it('plik zawiera metadane i podsumowanie', async () => {
    const src = await filledDb('backup-meta');
    const file = await exportData(src, new Date('2026-11-08T10:00:00Z'));
    expect(file).toMatchObject({ app: 'gymtracker', format: 1, exportedAt: '2026-11-08T10:00:00.000Z' });
    expect(summarizeBackup(file)).toMatchObject({ sessions: 1, bodyWeights: 1, templates: 4, firstDate: '2026-11-02', lastDate: '2026-11-02' });
    src.close();
  });

  it('nazwa pliku zawiera datę', () => {
    expect(backupFileName(new Date(2026, 10, 8))).toBe('trening-kopia-2026-11-08.json');
  });

  it('odrzuca nieprawidłowe pliki z czytelnym komunikatem', () => {
    const ok = { app: 'gymtracker', format: 1, data: { exercises: [{ id: 'x', name: 'X' }], sessions: [] } };
    expect(() => parseBackup('nie json')).toThrow('poprawny plik JSON');
    expect(() => parseBackup(JSON.stringify({ foo: 1 }))).toThrow('nie jest kopia zapasowa');
    expect(() => parseBackup(JSON.stringify({ ...ok, format: 99 }))).toThrow('nowszej wersji');
    expect(() => parseBackup(JSON.stringify({ ...ok, data: { exercises: [], sessions: [] } }))).toThrow('pusta');
    expect(() => parseBackup(JSON.stringify({ ...ok, data: { ...ok.data, sessions: [{ id: 's', date: '2.11.2026', entries: [] }] } }))).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ ...ok, data: { ...ok.data, sessions: [{ id: 's', date: '2026-11-02', entries: [{ exerciseId: 'brak' }] }] } })),
    ).toThrow('nieistniejącego ćwiczenia');
    expect(parseBackup(JSON.stringify(ok)).data.exercises).toHaveLength(1);
  });

  it('nieudany import nie zmienia danych (transakcja)', async () => {
    const db = await filledDb('backup-atomic');
    const before = await dump(db);
    const broken = { app: 'gymtracker' as const, format: 1, exportedAt: '', data: { ...(await exportData(db)).data, bodyWeights: [{ id: null } as never] } };
    await expect(importData(db, broken)).rejects.toBeTruthy();
    expect(await dump(db)).toEqual(before);
    db.close();
  });
});
