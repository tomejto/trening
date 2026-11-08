import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useSessions, useSettings, useTemplates } from '../db/hooks';
import type { BodyPart, Exercise, ExerciseDescription, ExerciseKind } from '../db/types';
import { Button, Card, Content, Field, Header, Segmented, Stepper, Toggle, cx, inputCls } from '../components/ui';
import { LineChart, exerciseChartSeries } from '../components/charts';
import { DescriptionView, hasDescription } from '../components/ExerciseInfo';
import { findPrevious, restSecondsFor, startingWeight, workingWeightOverride } from '../logic/workout';
import { exerciseSeries } from '../logic/stats';
import { fmtDateShort, fmtKg, fmtSets } from '../lib/format';

/** Karta ćwiczenia: opis techniki, własne notatki, postępy i ustawienia. */
export default function ExerciseScreen() {
  const { id } = useParams();
  const settings = useSettings();
  const templates = useTemplates();
  const sessions = useSessions();
  const [ex, setEx] = useState<Exercise | null | undefined>(undefined);
  const exRef = useRef<Exercise | null>(null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    db.exercises.get(id!).then((e) => {
      exRef.current = e ?? null;
      setEx(e ?? null);
    });
  }, [id]);

  const update = (patch: Partial<Exercise>) => {
    if (!exRef.current) return;
    const next = { ...exRef.current, ...patch };
    exRef.current = next;
    setEx(next);
    db.exercises.put(next);
  };

  if (ex === undefined || !settings || !templates || !sessions) return null;
  if (ex === null)
    return (
      <>
        <Header title="Ćwiczenie" back />
        <Content>
          <Card>Nie znaleziono ćwiczenia.</Card>
        </Content>
      </>
    );

  const usedIn = templates.filter((t) => t.items.some((i) => i.exerciseId === ex.id || i.altExerciseIds.includes(ex.id)));
  const defaultRest = restSecondsFor({ kind: ex.kind }, settings);
  const series = exerciseSeries(sessions, ex.id);
  const d = ex.description;
  const hasDesc = hasDescription(d);
  const prev = findPrevious(sessions, ex.id, null);
  const override = workingWeightOverride(ex, prev);
  const start = startingWeight(ex, prev);

  return (
    <>
      <Header
        title={ex.name}
        subtitle={[ex.bodyPart === 'upper' ? 'Góra ciała' : 'Nogi', ex.kind === 'compound' ? 'wielostawowe' : 'izolacja', ex.unilateral && 'na nogę'].filter(Boolean).join(' · ')}
        back
      />
      <Content>
        <Card>
          <Field label="🏋️ Ciężar roboczy (kg)">
            <Stepper
              value={override}
              step={ex.weightStep}
              startAt={start ?? 0}
              placeholder={start != null ? fmtKg(start) : 'kg'}
              ariaLabel="Ciężar roboczy"
              onChange={(v) => update({ workingWeight: v ?? undefined, workingWeightAt: Date.now() })}
            />
          </Field>
          <p className="mt-1.5 text-sm text-zinc-500">
            {override != null
              ? `Kolejny trening zacznie od ${fmtKg(override)} kg.`
              : prev && start != null
                ? `Ostatni trening (${fmtDateShort(prev.session.date)}): ${fmtKg(start)} kg – kolejny zacznie od wyników z tamtego dnia. Wpisz ciężar, żeby to zmienić.`
                : 'Wpisz ciężar, od którego zaczynasz – pierwszy trening wypełni się nim sam.'}
          </p>
        </Card>

        <Card>
          <Field label="📝 Moje notatki (ustawienie maszyny, siedziska itp.)">
            <textarea
              value={ex.userNotes}
              onChange={(e) => update({ userNotes: e.target.value })}
              rows={3}
              placeholder="np. siedzisko na 4, oparcie na 2"
              className={cx(inputCls, 'py-2')}
            />
          </Field>
        </Card>

        <Card>
          <div className="mb-2 flex items-center">
            <h2 className="flex-1 text-lg font-bold">Technika</h2>
            <button onClick={() => setEditingDesc(!editingDesc)} className="min-h-10 rounded-lg px-2 text-sm font-semibold text-accent-600 dark:text-accent-400">
              {editingDesc ? 'Gotowe' : 'Edytuj opis'}
            </button>
          </div>
          {editingDesc ? (
            <DescriptionEditor value={d} onChange={(description) => update({ description })} />
          ) : hasDesc ? (
            <DescriptionView d={d} />
          ) : (
            <p className="text-zinc-500">Brak opisu. Dotknij „Edytuj opis”, żeby go dodać.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold">Postępy</h2>
          {series.length === 0 ? (
            <p className="text-zinc-500">Brak zapisanych serii tego ćwiczenia.</p>
          ) : (
            <>
              <LineChart series={exerciseChartSeries(series)} />
              <h3 className="mt-3 mb-1 text-sm font-semibold text-zinc-500">Ostatnie treningi</h3>
              <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                {[...series]
                  .reverse()
                  .slice(0, 6)
                  .map((p) => (
                    <li key={p.sessionId}>
                      <Link to={`/historia/${p.sessionId}`} className="flex gap-2 py-2">
                        <span className="w-14 shrink-0 text-zinc-500">{fmtDateShort(p.date)}</span>
                        <span className="flex-1 tabular-nums">
                          {fmtSets(p.sets)}
                          {p.isDeload && <span className="ml-1 text-xs text-zinc-500">(lżej)</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <button onClick={() => setShowSettings(!showSettings)} className="flex min-h-10 w-full items-center text-left">
            <h2 className="flex-1 text-lg font-bold">Ustawienia ćwiczenia</h2>
            <span className="text-zinc-500">{showSettings ? '▲' : '▼'}</span>
          </button>
          {showSettings && (
            <div className="mt-3 space-y-3">
              <Field label="Nazwa">
                <input value={ex.name} onChange={(e) => update({ name: e.target.value })} className={inputCls} />
              </Field>
              <Segmented
                options={[{ value: 'upper' as BodyPart, label: 'Góra ciała' }, { value: 'lower' as BodyPart, label: 'Nogi' }]}
                value={ex.bodyPart}
                onChange={(bodyPart) => update({ bodyPart })}
              />
              <Segmented
                options={[{ value: 'compound' as ExerciseKind, label: 'Wielostawowe' }, { value: 'isolation' as ExerciseKind, label: 'Izolacja' }]}
                value={ex.kind}
                onChange={(kind) => update({ kind })}
              />
              <Toggle checked={ex.unilateral} onChange={(unilateral) => update({ unilateral })} label="Jednonóż / jednorącz" hint="Powtórzenia oznaczane „na nogę”" />
              <Field label="Krok progresji (kg)">
                <Stepper value={ex.weightStep} step={0.5} min={0.5} onChange={(v) => update({ weightStep: v ?? 2.5 })} />
              </Field>
              <Field label={`Przerwa (s) – puste = domyślna ${defaultRest} s`}>
                <Stepper
                  value={ex.restSec ?? null}
                  step={15}
                  min={0}
                  allowDecimal={false}
                  startAt={defaultRest}
                  placeholder={`${defaultRest}`}
                  onChange={(v) => update({ restSec: v || undefined })}
                />
              </Field>
              <p className="text-sm text-zinc-500">{usedIn.length ? `W planie: ${usedIn.map((t) => t.name).join(', ')}` : 'Tego ćwiczenia nie ma obecnie w planie.'}</p>
              <Button variant="ghost" className="w-full" onClick={() => update({ archived: !ex.archived })}>
                {ex.archived ? 'Przywróć ćwiczenie' : 'Ukryj w wyborze ćwiczeń (archiwizuj)'}
              </Button>
            </div>
          )}
        </Card>
      </Content>
    </>
  );
}

/** Edycja opisu – listy jako tekst, jedna pozycja w linii. */
function DescriptionEditor({ value, onChange }: { value: ExerciseDescription; onChange: (d: ExerciseDescription) => void }) {
  const [lists, setLists] = useState({ steps: value.steps.join('\n'), mistakes: value.mistakes.join('\n'), tips: value.tips.join('\n') });
  const toList = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean);
  const setList = (key: 'steps' | 'mistakes' | 'tips', text: string) => {
    setLists((l) => ({ ...l, [key]: text }));
    onChange({ ...value, [key]: toList(text) });
  };
  const area = cx(inputCls, 'py-2');
  return (
    <div className="space-y-3">
      <Field label="Pracujące mięśnie">
        <textarea rows={2} value={value.muscles} onChange={(e) => onChange({ ...value, muscles: e.target.value })} className={area} />
      </Field>
      <Field label="Ustawienie">
        <textarea rows={3} value={value.setup} onChange={(e) => onChange({ ...value, setup: e.target.value })} className={area} />
      </Field>
      <Field label="Wykonanie (krok w linii)">
        <textarea rows={5} value={lists.steps} onChange={(e) => setList('steps', e.target.value)} className={area} />
      </Field>
      <Field label="Najczęstsze błędy (jeden w linii)">
        <textarea rows={4} value={lists.mistakes} onChange={(e) => setList('mistakes', e.target.value)} className={area} />
      </Field>
      <Field label="Wskazówki (jedna w linii)">
        <textarea rows={3} value={lists.tips} onChange={(e) => setList('tips', e.target.value)} className={area} />
      </Field>
    </div>
  );
}
