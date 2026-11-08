import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useExerciseMap, useSettings } from '../db/hooks';
import { useRestTimer, useWakeLock } from '../timer/RestTimer';
import { deloadWeight } from '../logic/deload';
import type { Exercise, Session, SessionEntry, SetLog } from '../db/types';
import { Button, Card, Content, Field, Header, Sheet, Stepper, Toggle, cx, inputCls } from '../components/ui';
import { ExerciseInfoPanel } from '../components/ExerciseInfo';
import { fmtDateLong, fmtDateShort, fmtKg, fmtSets, repRange } from '../lib/format';
import { doneSets, findPrevious, groupBySuperset, prefillSets, progressionSuggestion, restAfterSet, workingWeightOverride } from '../logic/workout';

const CARDIO_TYPES = ['Bieżnia', 'Rower', 'Orbitrek', 'Schody', 'Wioślarz'];

export default function WorkoutScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercises = useExerciseMap();
  const history = useLiveQuery(() => db.sessions.where('status').equals('done').toArray());
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const settings = useSettings();
  const timer = useRestTimer();
  useWakeLock(session?.status === 'in_progress');

  // Sesję trzymamy lokalnie (płynne wpisywanie) i zapisujemy do bazy przy każdej zmianie.
  useEffect(() => {
    db.sessions.get(id!).then((s) => {
      sessionRef.current = s ?? null;
      setSession(s ?? null);
    });
  }, [id]);

  const update = (fn: (s: Session) => Session) => {
    const cur = sessionRef.current;
    if (!cur) return;
    const next = fn(cur);
    sessionRef.current = next;
    setSession(next);
    db.sessions.put(next);
  };

  const updateEntry = (entryId: string, fn: (e: SessionEntry) => SessionEntry) =>
    update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === entryId ? fn(e) : e)) }));

  if (session === undefined || !exercises || !history || !settings) return null;
  if (session === null) {
    return (
      <>
        <Header title="Trening" back="/" />
        <Content>
          <Card>Nie znaleziono treningu.</Card>
        </Content>
      </>
    );
  }

  const isEditingDone = session.status === 'done';
  const totalSets = session.entries.reduce((n, e) => n + e.setLogs.length, 0);
  const confirmedSets = session.entries.reduce((n, e) => n + e.setLogs.filter((s) => s.done).length, 0);

  const finish = async () => {
    const pending = session.entries.some((e) => e.setLogs.some((s) => !s.done && s.reps != null));
    if (!isEditingDone && pending && !confirm('Część serii nie jest zatwierdzona (✓). Niezatwierdzone serie nie trafią do historii. Zakończyć?')) return;
    update((s) => ({ ...s, status: 'done', finishedAt: s.finishedAt ?? Date.now() }));
    navigate(isEditingDone ? `/historia/${session.id}` : '/', { replace: isEditingDone });
  };

  const onSetConfirmed = (entry: SessionEntry) => {
    if (isEditingDone) return;
    const sec = restAfterSet(session.entries, entry.id, exercises, settings);
    if (sec == null) return;
    const group = groupBySuperset(session.entries).find((g) => g.some((e) => e.id === entry.id));
    const label = group && group.length > 1 ? 'superseria' : (exercises.get(entry.exerciseId)?.name ?? '');
    timer.start(sec, label);
  };

  const remove = async () => {
    if (!confirm('Usunąć ten trening? Tej operacji nie można cofnąć.')) return;
    await db.sessions.delete(session.id);
    navigate(isEditingDone ? '/historia' : '/', { replace: true });
  };

  const switchExercise = (entry: SessionEntry, newId: string) => {
    if (newId === entry.exerciseId) return;
    const prev = findPrevious(history, newId, session.templateId, session.id);
    const anyDone = entry.setLogs.some((s) => s.done);
    updateEntry(entry.id, (e) => ({
      ...e,
      exerciseId: newId,
      altExerciseIds: [e.exerciseId, ...e.altExerciseIds.filter((x) => x !== newId)],
      setLogs: anyDone
        ? e.setLogs
        : prefillSets(e.setLogs.length, prev?.entry, workingWeightOverride(exercises.get(newId), prev)).map((s) =>
            session.isDeload ? { ...s, weight: deloadWeight(s.weight, settings.deloadWeightPct, exercises.get(newId)?.weightStep ?? 2.5) } : s,
          ),
    }));
  };

  return (
    <>
      <Header
        back={isEditingDone ? `/historia/${session.id}` : '/'}
        title={session.templateName}
        subtitle={
          <span>
            {fmtDateLong(session.date)}
            {session.isDeload && ' · lżejszy'}
            {isEditingDone ? ' · edycja' : ` · ${confirmedSets}/${totalSets} serii`}
          </span>
        }
        right={
          <button aria-label="Opcje" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl active:bg-zinc-200 dark:active:bg-zinc-800">
            ⋯
          </button>
        }
      />
      <Content className="pb-48">
        {groupBySuperset(session.entries).map((group) =>
          group.length > 1 ? (
            <div key={group[0].id} className="space-y-2 rounded-3xl border-2 border-accent-500/60 p-1.5">
              <div className="px-2 pt-1 text-xs font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">
                Superseria – wykonuj na zmianę, przerwa po drugim ćwiczeniu
              </div>
              {group.map((entry) => (
                <ExerciseBlock
                  key={entry.id}
                  entry={entry}
                  session={session}
                  history={history}
                  exercises={exercises}
                  onChange={(fn) => updateEntry(entry.id, fn)}
                  onSwitch={(nid) => switchExercise(entry, nid)}
                  onSetConfirmed={() => onSetConfirmed(entry)}
                />
              ))}
            </div>
          ) : (
            <ExerciseBlock
              key={group[0].id}
              entry={group[0]}
              session={session}
              history={history}
              exercises={exercises}
              onChange={(fn) => updateEntry(group[0].id, fn)}
              onSwitch={(nid) => switchExercise(group[0], nid)}
              onSetConfirmed={() => onSetConfirmed(group[0])}
            />
          ),
        )}

        <CardioCard session={session} onChange={(cardio) => update((s) => ({ ...s, cardio }))} />

        <Card>
          <Field label="Notatka do treningu">
            <textarea
              value={session.note}
              onChange={(e) => {
                const note = e.target.value;
                update((s) => ({ ...s, note }));
              }}
              rows={3}
              placeholder="Samopoczucie, sen, uwagi…"
              className={cx(inputCls, 'py-2')}
            />
          </Field>
        </Card>
      </Content>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-3 py-2">
          <div className="text-sm text-zinc-500">
            <div className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {confirmedSets}/{totalSets}
            </div>
            serii
          </div>
          <Button variant="primary" className="flex-1 text-lg" onClick={finish}>
            {isEditingDone ? 'Zapisz' : 'Zakończ trening'}
          </Button>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Opcje treningu">
        <div className="space-y-2">
          <Field label="Data treningu">
            <input
              type="date"
              value={session.date}
              onChange={(e) => {
                const date = e.target.value;
                if (date) update((s) => ({ ...s, date }));
              }}
              className={inputCls}
            />
          </Field>
          <Toggle
            checked={session.isDeload}
            onChange={(isDeload) => update((s) => ({ ...s, isDeload }))}
            label="Lżejszy trening (odciążenie)"
            hint="Nie liczy się do progresji ani podpowiedzi „poprzednio”"
          />
          <Button variant="danger" className="w-full" onClick={remove}>
            Usuń trening
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function ExerciseBlock({
  entry,
  session,
  history,
  exercises,
  onChange,
  onSwitch,
  onSetConfirmed,
}: {
  entry: SessionEntry;
  session: Session;
  history: Session[];
  exercises: Map<string, Exercise>;
  onChange: (fn: (e: SessionEntry) => SessionEntry) => void;
  onSwitch: (exerciseId: string) => void;
  onSetConfirmed: () => void;
}) {
  const ex = exercises.get(entry.exerciseId);
  const prev = findPrevious(history, entry.exerciseId, session.templateId, session.id);
  const step = ex?.weightStep ?? 2.5;
  const suggestion = session.isDeload ? null : progressionSuggestion(prev?.entry, entry, step);
  const pendingSets = entry.setLogs.filter((s) => !s.done);
  const applied = suggestion != null && pendingSets.length > 0 && pendingSets.every((s) => (s.weight ?? -Infinity) >= suggestion);
  const options = [entry.exerciseId, ...entry.altExerciseIds];
  const allDone = entry.setLogs.length > 0 && entry.setLogs.every((s) => s.done);

  const setLog = (i: number, patch: Partial<SetLog>) =>
    onChange((e) => ({ ...e, setLogs: e.setLogs.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  /** Zatwierdzenie serii; puste pola następnej serii wypełniamy wartościami właśnie zrobionej. */
  const confirmSet = (i: number) => {
    onChange((e) => {
      const cur = e.setLogs[i];
      const confirmed = { ...cur, done: true, weight: cur.weight ?? 0 };
      return {
        ...e,
        setLogs: e.setLogs.map((s, j) => {
          if (j === i) return confirmed;
          if (j === i + 1 && !s.done) return { ...s, weight: s.weight ?? confirmed.weight, reps: s.reps ?? confirmed.reps };
          return s;
        }),
      };
    });
    onSetConfirmed();
  };

  const applySuggestion = () =>
    onChange((e) => ({ ...e, setLogs: e.setLogs.map((s) => (s.done ? s : { ...s, weight: suggestion, reps: e.repMin })) }));

  return (
    <Card className={cx(allDone && 'border-accent-500/50')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link to={`/cwiczenia/${entry.exerciseId}`} className="text-lg font-bold leading-snug underline-offset-2 active:underline">
            {ex?.name ?? 'Nieznane ćwiczenie'}
          </Link>
          <div className="text-sm text-zinc-500">
            {entry.sets} × {repRange(entry.repMin, entry.repMax)} {ex?.unilateral ? 'na nogę' : 'powt.'}
            {ex && ` · ${ex.kind === 'compound' ? 'wielostawowe' : 'izolacja'}`}
          </div>
        </div>
        {allDone && <span className="text-xl text-accent-500">✓</span>}
      </div>

      {options.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[...options]
            .sort((a, b) => (exercises.get(a)?.name ?? '').localeCompare(exercises.get(b)?.name ?? '', 'pl'))
            .map((oid) => (
              <button
                key={oid}
                onClick={() => onSwitch(oid)}
                className={cx(
                  'min-h-9 rounded-full border px-3 text-sm font-medium',
                  oid === entry.exerciseId ? 'border-accent-500 bg-accent-500/15 text-accent-700 dark:text-accent-300' : 'border-zinc-300 dark:border-zinc-700',
                )}
              >
                {exercises.get(oid)?.name ?? '?'}
              </button>
            ))}
        </div>
      )}

      {entry.note && <p className="mt-1 text-sm italic text-zinc-500">{entry.note}</p>}

      {ex && <ExerciseInfoPanel key={ex.id} exercise={ex} />}

      <div className="mt-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800/70">
        {prev ? (
          <>
            <span className="text-zinc-500">Poprzednio ({fmtDateShort(prev.session.date)}): </span>
            <span className="font-semibold tabular-nums">
              {fmtSets(doneSets(prev.entry))}
            </span>
          </>
        ) : (
          <span className="text-zinc-500">
            {ex?.workingWeight != null
              ? `Brak poprzedniego wyniku – start od ciężaru roboczego ${fmtKg(ex.workingWeight)} kg.`
              : 'Brak poprzedniego wyniku – wpisz ciężar i powtórzenia.'}
          </span>
        )}
      </div>

      {suggestion != null && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-accent-500/40 bg-accent-500/10 px-3 py-2 text-sm">
          <span className="text-lg">⬆️</span>
          <span className="flex-1">
            {applied ? (
              <>Nowy ciężar ustawiony: <b>{fmtKg(suggestion)} kg</b></>
            ) : (
              <>
                Górny zakres we wszystkich seriach – spróbuj <b>{fmtKg(suggestion)} kg</b>
              </>
            )}
          </span>
          {!applied && pendingSets.length > 0 && (
            <button onClick={applySuggestion} className="min-h-10 rounded-lg bg-accent-500 px-3 font-semibold text-white dark:text-zinc-950">
              Zastosuj
            </button>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <div className="flex gap-2 px-1 text-xs font-medium text-zinc-500">
          <span className="w-12 text-center">Seria</span>
          <span className="flex-[1.15] text-center">Ciężar (kg)</span>
          <span className="flex-1 text-center">{ex?.unilateral ? 'Powt. /nogę' : 'Powtórzenia'}</span>
        </div>
        {entry.setLogs.map((s, i) => (
          <div key={i} className={cx('flex items-center gap-2 rounded-xl p-1', s.done && 'bg-accent-500/10')}>
            <button
              onClick={() => (s.done ? setLog(i, { done: false }) : confirmSet(i))}
              disabled={!s.done && s.reps == null}
              aria-label={s.done ? `Cofnij serię ${i + 1}` : `Zatwierdź serię ${i + 1}`}
              className={cx(
                'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 font-bold leading-none disabled:opacity-40',
                s.done ? 'border-accent-500 bg-accent-500 text-white dark:text-zinc-950' : 'border-zinc-300 dark:border-zinc-600',
              )}
            >
              <span className="text-[10px] opacity-70">{i + 1}</span>
              <span className="text-xl">✓</span>
            </button>
            <div className="min-w-0 flex-[1.15]">
              <Stepper compact value={s.weight} step={step} onChange={(v) => setLog(i, { weight: v })} placeholder="kg" ariaLabel={`Ciężar seria ${i + 1}`} />
            </div>
            <div className="min-w-0 flex-1">
              <Stepper
                compact
                value={s.reps}
                min={0}
                startAt={entry.repMin}
                allowDecimal={false}
                onChange={(v) => setLog(i, { reps: v })}
                placeholder={repRange(entry.repMin, entry.repMax)}
                ariaLabel={`Powtórzenia seria ${i + 1}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        {entry.setLogs.length > 1 && (
          <button
            onClick={() => onChange((e) => ({ ...e, setLogs: e.setLogs.slice(0, -1) }))}
            className="min-h-10 rounded-lg px-3 text-sm font-medium text-zinc-500 active:bg-zinc-200 dark:active:bg-zinc-800"
          >
            − usuń serię
          </button>
        )}
        <button
          onClick={() =>
            onChange((e) => {
              const last = e.setLogs[e.setLogs.length - 1];
              return { ...e, setLogs: [...e.setLogs, { weight: last?.weight ?? null, reps: last?.reps ?? null, done: false }] };
            })
          }
          className="min-h-10 rounded-lg px-3 text-sm font-medium text-accent-600 active:bg-zinc-200 dark:text-accent-400 dark:active:bg-zinc-800"
        >
          + dodaj serię
        </button>
      </div>
    </Card>
  );
}

function CardioCard({ session, onChange }: { session: Session; onChange: (c: Session['cardio']) => void }) {
  const c = session.cardio;
  const [open, setOpen] = useState(c.planned || c.done);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 dark:border-zinc-700">
        + Dodaj cardio
      </button>
    );
  }
  return (
    <Card>
      <Toggle
        checked={c.done}
        onChange={(done) => onChange({ ...c, done })}
        label={<span className="text-lg font-bold">Cardio {c.planned && c.minutes ? `(${c.minutes} min)` : ''}</span>}
        hint={c.done ? 'Zrobione 👍' : 'Odznacz, gdy zrobisz'}
      />
      {c.done && (
        <div className="mt-2 space-y-3">
          <Field label="Czas (min)">
            <Stepper value={c.minutes ?? null} step={5} min={0} allowDecimal={false} onChange={(v) => onChange({ ...c, minutes: v ?? undefined })} />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-500">Rodzaj</span>
            <div className="flex flex-wrap gap-1.5">
              {CARDIO_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => onChange({ ...c, type: c.type === t ? undefined : t })}
                  className={cx(
                    'min-h-10 rounded-full border px-3 text-sm font-medium',
                    c.type === t ? 'border-accent-500 bg-accent-500/15 text-accent-700 dark:text-accent-300' : 'border-zinc-300 dark:border-zinc-700',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
