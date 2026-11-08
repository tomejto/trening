import { useState } from 'react';
import { db } from '../db/db';
import { useExercises } from '../db/hooks';
import type { BodyPart, ExerciseKind } from '../db/types';
import { newId } from '../lib/ids';
import { Button, Field, Segmented, Sheet, Toggle, cx, inputCls } from './ui';

/** Arkusz wyboru ćwiczenia z wyszukiwaniem i tworzeniem nowego. */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  excludeIds = [],
  title = 'Wybierz ćwiczenie',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  excludeIds?: string[];
  title?: string;
}) {
  const exercises = useExercises();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const list = (exercises ?? [])
    .filter((e) => !e.archived && !excludeIds.includes(e.id))
    .filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  const close = () => {
    setQ('');
    setCreating(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={creating ? 'Nowe ćwiczenie' : title}>
      {creating ? (
        <NewExerciseForm
          initialName={q}
          onCreated={(id) => {
            onPick(id);
            close();
          }}
        />
      ) : (
        <div className="space-y-2">
          <input autoFocus={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj…" className={inputCls} />
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onPick(e.id);
                  close();
                }}
                className="flex min-h-12 w-full items-center gap-2 py-2 text-left active:bg-zinc-200 dark:active:bg-zinc-800"
              >
                <span className="flex-1">{e.name}</span>
                <span className={cx('text-xs', e.bodyPart === 'upper' ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400')}>
                  {e.bodyPart === 'upper' ? 'góra' : 'dół'}
                </span>
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={() => setCreating(true)}>
            + Nowe ćwiczenie{q.trim() && `: „${q.trim()}”`}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function NewExerciseForm({ initialName, onCreated }: { initialName: string; onCreated: (id: string) => void }) {
  const [name, setName] = useState(initialName.trim());
  const [bodyPart, setBodyPart] = useState<BodyPart>('upper');
  const [kind, setKind] = useState<ExerciseKind>('isolation');
  const [unilateral, setUnilateral] = useState(false);

  const save = async () => {
    const id = newId();
    await db.exercises.add({
      id,
      name: name.trim(),
      bodyPart,
      kind,
      unilateral,
      weightStep: bodyPart === 'upper' ? 2.5 : 5,
      description: { muscles: '', setup: '', steps: [], mistakes: [], tips: [] },
      userNotes: '',
    });
    onCreated(id);
  };

  return (
    <div className="space-y-3">
      <Field label="Nazwa">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Segmented options={[{ value: 'upper' as BodyPart, label: 'Góra ciała' }, { value: 'lower' as BodyPart, label: 'Nogi' }]} value={bodyPart} onChange={setBodyPart} />
      <Segmented options={[{ value: 'compound' as ExerciseKind, label: 'Wielostawowe' }, { value: 'isolation' as ExerciseKind, label: 'Izolacja' }]} value={kind} onChange={setKind} />
      <Toggle checked={unilateral} onChange={setUnilateral} label="Jednonóż / jednorącz" hint="Powtórzenia liczone na stronę" />
      <Button variant="primary" className="w-full" disabled={!name.trim()} onClick={save}>
        Dodaj ćwiczenie
      </Button>
    </div>
  );
}
