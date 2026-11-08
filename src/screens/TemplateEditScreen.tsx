import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useExerciseMap } from '../db/hooks';
import type { TemplateItem, WorkoutTemplate } from '../db/types';
import { Button, Card, Content, Field, Header, Sheet, Stepper, Toggle, cx, inputCls } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { WEEKDAYS_SHORT, WEEKDAY_ORDER, repRange } from '../lib/format';
import { newId } from '../lib/ids';

export default function TemplateEditScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercises = useExerciseMap();
  const [tpl, setTpl] = useState<WorkoutTemplate | null | undefined>(undefined);
  const tplRef = useRef<WorkoutTemplate | null>(null);
  const [editing, setEditing] = useState<{ item: TemplateItem; isNew: boolean } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    db.templates.get(id!).then((t) => {
      tplRef.current = t ?? null;
      setTpl(t ?? null);
    });
  }, [id]);

  const update = (fn: (t: WorkoutTemplate) => WorkoutTemplate) => {
    if (!tplRef.current) return;
    const next = fn(tplRef.current);
    tplRef.current = next;
    setTpl(next);
    db.templates.put(next);
  };

  if (tpl === undefined || !exercises) return null;
  if (tpl === null)
    return (
      <>
        <Header title="Trening" back="/plan" />
        <Content>
          <Card>Nie znaleziono treningu.</Card>
        </Content>
      </>
    );

  const move = (index: number, dir: -1 | 1) =>
    update((t) => {
      const items = [...t.items];
      const j = index + dir;
      if (j < 0 || j >= items.length) return t;
      [items[index], items[j]] = [items[j], items[index]];
      return { ...t, items };
    });

  const saveItem = (item: TemplateItem) => {
    update((t) => {
      const exists = t.items.some((i) => i.id === item.id);
      return { ...t, items: exists ? t.items.map((i) => (i.id === item.id ? item : i)) : [...t.items, item] };
    });
    setEditing(null);
  };

  const removeItem = (itemId: string) => {
    update((t) => ({ ...t, items: t.items.filter((i) => i.id !== itemId) }));
    setEditing(null);
  };

  const removeTemplate = async () => {
    if (!confirm(`Usunąć „${tpl.name}” z planu? Historia treningów zostaje.`)) return;
    await db.templates.delete(tpl.id);
    navigate('/plan');
  };

  return (
    <>
      <Header title={tpl.name || 'Trening'} subtitle="Edycja planu" back="/plan" />
      <Content>
        <Card className="space-y-3">
          <Field label="Nazwa">
            <input value={tpl.name} onChange={(e) => update((t) => ({ ...t, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Opis (np. siłowo / objętościowo)">
            <input value={tpl.subtitle ?? ''} onChange={(e) => update((t) => ({ ...t, subtitle: e.target.value }))} className={inputCls} />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Dzień tygodnia</span>
            <div className="grid grid-cols-8 gap-1">
              {[...WEEKDAY_ORDER, null].map((d) => (
                <button
                  key={String(d)}
                  onClick={() => update((t) => ({ ...t, weekday: d }))}
                  className={cx(
                    'min-h-11 rounded-lg text-sm font-semibold',
                    tpl.weekday === d ? 'bg-accent-500 text-white dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800',
                  )}
                >
                  {d == null ? '—' : WEEKDAYS_SHORT[d]}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            checked={tpl.cardio.enabled}
            onChange={(enabled) => update((t) => ({ ...t, cardio: { ...t.cardio, enabled } }))}
            label="Cardio po treningu"
          />
          {tpl.cardio.enabled && (
            <Field label="Czas cardio (min)">
              <Stepper
                value={tpl.cardio.minutes}
                step={5}
                min={0}
                allowDecimal={false}
                onChange={(v) => update((t) => ({ ...t, cardio: { ...t.cardio, minutes: v ?? 0 } }))}
              />
            </Field>
          )}
        </Card>

        <h2 className="px-1 pt-2 text-sm font-bold uppercase tracking-wide text-zinc-500">Ćwiczenia</h2>
        <Card className="p-0">
          {tpl.items.length === 0 && <p className="p-4 text-center text-zinc-500">Brak ćwiczeń.</p>}
          {tpl.items.map((it, i) => {
            const ex = exercises.get(it.exerciseId);
            const inSuperset = it.supersetWithNext || tpl.items[i - 1]?.supersetWithNext;
            return (
              <div key={it.id} className={cx('flex items-center gap-1 border-zinc-200 dark:border-zinc-800', i > 0 && !tpl.items[i - 1]?.supersetWithNext && 'border-t')}>
                <div className={cx('w-1 self-stretch', inSuperset && 'bg-accent-500')} />
                <button onClick={() => setEditing({ item: it, isNew: false })} className="min-h-14 min-w-0 flex-1 py-2 pl-2 text-left">
                  <div className="truncate font-medium">{ex?.name ?? '?'}</div>
                  <div className="text-sm text-zinc-500">
                    {it.sets} × {repRange(it.repMin, it.repMax)}
                    {ex?.unilateral && ' na nogę'}
                    {it.supersetWithNext && ' · superseria z następnym'}
                    {it.altExerciseIds.length > 0 && ` · +${it.altExerciseIds.length} alt.`}
                  </div>
                </button>
                <div className="flex shrink-0 flex-col">
                  <button aria-label="W górę" disabled={i === 0} onClick={() => move(i, -1)} className="h-8 w-11 text-lg text-zinc-500 disabled:opacity-20">
                    ▲
                  </button>
                  <button aria-label="W dół" disabled={i === tpl.items.length - 1} onClick={() => move(i, 1)} className="h-8 w-11 text-lg text-zinc-500 disabled:opacity-20">
                    ▼
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
        <Button className="w-full" onClick={() => setAdding(true)}>
          + Dodaj ćwiczenie
        </Button>

        <Button variant="ghost" className="mt-6 w-full text-red-600 dark:text-red-400" onClick={removeTemplate}>
          Usuń ten trening z planu
        </Button>
      </Content>

      <ExercisePicker
        open={adding}
        onClose={() => setAdding(false)}
        onPick={(exerciseId) => {
          const ex = exercises.get(exerciseId);
          const compound = ex?.kind === 'compound';
          setEditing({
            isNew: true,
            item: { id: newId(), exerciseId, altExerciseIds: [], sets: 3, repMin: compound ? 8 : 10, repMax: compound ? 10 : 12 },
          });
        }}
      />

      {editing && (
        <ItemEditor
          key={editing.item.id}
          item={editing.item}
          isNew={editing.isNew}
          isLast={tpl.items[tpl.items.length - 1]?.id === editing.item.id || editing.isNew}
          onClose={() => setEditing(null)}
          onSave={saveItem}
          onRemove={() => removeItem(editing.item.id)}
        />
      )}
    </>
  );
}

function ItemEditor({
  item,
  isNew,
  isLast,
  onClose,
  onSave,
  onRemove,
}: {
  item: TemplateItem;
  isNew: boolean;
  isLast: boolean;
  onClose: () => void;
  onSave: (i: TemplateItem) => void;
  onRemove: () => void;
}) {
  const exercises = useExerciseMap();
  const [draft, setDraft] = useState<TemplateItem>(item);
  const [picker, setPicker] = useState<'main' | 'alt' | null>(null);
  const set = (patch: Partial<TemplateItem>) => setDraft((d) => ({ ...d, ...patch }));
  const ex = exercises?.get(draft.exerciseId);
  const valid = draft.sets >= 1 && draft.repMin >= 1 && draft.repMax >= draft.repMin;

  return (
    <>
      <Sheet open={picker === null} onClose={onClose} title={isNew ? 'Dodaj do treningu' : 'Edytuj ćwiczenie'}>
        <div className="space-y-4">
          <Field label="Ćwiczenie">
            <button onClick={() => setPicker('main')} className={cx(inputCls, 'flex items-center text-left')}>
              <span className="flex-1">{ex?.name ?? 'Wybierz…'}</span>
              <span className="text-sm text-accent-600 dark:text-accent-400">Zmień</span>
            </button>
          </Field>
          <p className="-mt-2 text-xs text-zinc-500">Zmiana ćwiczenia nie usuwa historii – wyniki są przypisane do konkretnego ćwiczenia.</p>
          {ex && !isNew && (
            <Link to={`/cwiczenia/${ex.id}`} className="-mt-2 inline-block text-sm font-semibold text-accent-600 dark:text-accent-400">
              Opis techniki i notatki ›
            </Link>
          )}

          <Field label="Serie">
            <Stepper value={draft.sets} min={1} allowDecimal={false} onChange={(v) => set({ sets: v ?? 1 })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Powtórzenia od">
              <Stepper value={draft.repMin} min={1} allowDecimal={false} onChange={(v) => set({ repMin: v ?? 1 })} />
            </Field>
            <Field label="do">
              <Stepper value={draft.repMax} min={1} allowDecimal={false} onChange={(v) => set({ repMax: v ?? 1 })} />
            </Field>
          </div>
          {draft.repMax < draft.repMin && <p className="text-sm text-red-600">Górna granica musi być ≥ dolnej.</p>}

          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Alternatywy (wybierasz na treningu)</span>
            <div className="flex flex-wrap gap-1.5">
              {draft.altExerciseIds.map((aid) => (
                <span key={aid} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-zinc-300 pl-3 text-sm dark:border-zinc-700">
                  {exercises?.get(aid)?.name ?? '?'}
                  <button aria-label="Usuń alternatywę" onClick={() => set({ altExerciseIds: draft.altExerciseIds.filter((x) => x !== aid) })} className="h-10 w-9 text-lg">
                    ×
                  </button>
                </span>
              ))}
              <button onClick={() => setPicker('alt')} className="min-h-10 rounded-full border border-dashed border-zinc-400 px-3 text-sm text-zinc-500">
                + alternatywa
              </button>
            </div>
          </div>

          <Toggle
            checked={!!draft.supersetWithNext}
            onChange={(v) => set({ supersetWithNext: v })}
            label="Superseria z następnym ćwiczeniem"
            hint={isLast ? 'To ostatnie ćwiczenie – dodaj kolejne, żeby superseria zadziałała' : 'Timer ruszy po drugim ćwiczeniu z pary'}
          />

          <Field label="Uwaga (opcjonalnie)">
            <input value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value || undefined })} placeholder="np. lżej niż we wtorek" className={inputCls} />
          </Field>

          <div className="flex gap-2 pt-2">
            {!isNew && (
              <Button variant="ghost" className="text-red-600 dark:text-red-400" onClick={onRemove}>
                Usuń
              </Button>
            )}
            <Button variant="primary" className="flex-1" disabled={!valid} onClick={() => onSave(draft)}>
              {isNew ? 'Dodaj' : 'Zapisz'}
            </Button>
          </div>
        </div>
      </Sheet>
      <ExercisePicker
        open={picker !== null}
        title={picker === 'alt' ? 'Dodaj alternatywę' : 'Wybierz ćwiczenie'}
        excludeIds={[draft.exerciseId, ...draft.altExerciseIds]}
        onClose={() => setPicker(null)}
        onPick={(id) => {
          if (picker === 'alt') set({ altExerciseIds: [...draft.altExerciseIds, id] });
          else set({ exerciseId: id });
        }}
      />
    </>
  );
}
