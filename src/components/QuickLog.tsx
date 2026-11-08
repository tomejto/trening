import { Link } from 'react-router-dom';
import type { Exercise, Session } from '../db/types';
import { Stepper, cx } from './ui';
import { fmtKg, repRange } from '../lib/format';
import { findPrevious, groupBySuperset, startingWeight } from '../logic/workout';
import { entryOptions, type QuickRow } from '../logic/quick';

/**
 * Lista ćwiczeń do szybkiego zapisu: przy każdym ćwiczeniu ciężar (wypełniony ostatnim wynikiem)
 * i znacznik „zrobione”. Bez serii i powtórzeń.
 */
export function QuickLog({
  session,
  rows,
  onChange,
  exercises,
  history,
}: {
  session: Session;
  rows: QuickRow[];
  onChange: (rows: QuickRow[]) => void;
  exercises: Map<string, Exercise>;
  /** Historia do podpowiedzi ciężaru po zmianie wariantu ćwiczenia. */
  history: Session[];
}) {
  const rowById = new Map(rows.map((r) => [r.entryId, r]));
  const set = (entryId: string, patch: Partial<QuickRow>) => onChange(rows.map((r) => (r.entryId === entryId ? { ...r, ...patch } : r)));

  return (
    <ol className="space-y-2">
      {groupBySuperset(session.entries).map((group) => (
        <li key={group[0].id} className={cx(group.length > 1 && 'rounded-xl border-l-4 border-accent-500 pl-2')}>
          {group.length > 1 && <div className="text-xs font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">Superseria</div>}
          {group.map((e) => {
            const row = rowById.get(e.id);
            if (!row) return null;
            const ex = exercises.get(row.exerciseId);
            const options = entryOptions(e);
            const prev = findPrevious(history, row.exerciseId, session.templateId, session.id);
            const prevTop = startingWeight(undefined, prev);
            return (
              <div key={e.id} className={cx('border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800', !row.done && 'opacity-50')}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set(e.id, { done: !row.done })}
                    aria-pressed={row.done}
                    aria-label={row.done ? 'Zrobione – dotknij, żeby oznaczyć jako pominięte' : 'Pominięte – dotknij, żeby oznaczyć jako zrobione'}
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold',
                      row.done ? 'border-accent-500 bg-accent-500 text-white dark:text-zinc-950' : 'border-zinc-300 text-transparent dark:border-zinc-600',
                    )}
                  >
                    ✓
                  </button>
                  <Link to={`/cwiczenia/${row.exerciseId}`} className="min-w-0 flex-1 leading-snug">
                    <span className="font-semibold">{ex?.name ?? '?'}</span> <span className="text-zinc-400">›</span>
                    <span className="block text-sm text-zinc-500">
                      {e.sets} × {repRange(e.repMin, e.repMax)}
                      {ex?.unilateral && ' /nogę'}
                      {!row.done && ' · pominięte'}
                    </span>
                  </Link>
                </div>
                {options.length > 1 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-11">
                    {options.map((oid) => (
                      <button
                        key={oid}
                        type="button"
                        onClick={() => {
                          if (oid === row.exerciseId) return;
                          const p = findPrevious(history, oid, session.templateId, session.id);
                          set(e.id, { exerciseId: oid, weight: startingWeight(exercises.get(oid), p) });
                        }}
                        className={cx(
                          'min-h-8 rounded-full border px-2.5 text-xs font-medium',
                          oid === row.exerciseId ? 'border-accent-500 bg-accent-500/15 text-accent-700 dark:text-accent-300' : 'border-zinc-300 dark:border-zinc-700',
                        )}
                      >
                        {exercises.get(oid)?.name ?? '?'}
                      </button>
                    ))}
                  </div>
                )}
                {row.done && (
                  <div className="mt-1.5 flex items-center gap-3 pl-11">
                    <div className="w-44 shrink-0">
                      <Stepper
                        compact
                        value={row.weight}
                        step={ex?.weightStep ?? 2.5}
                        startAt={prevTop ?? 0}
                        placeholder="–"
                        suffix="kg"
                        ariaLabel={`Ciężar: ${ex?.name ?? ''}`}
                        onChange={(weight) => set(e.id, { weight })}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {prev ? (
                        <>
                          Ostatnio
                          <br />
                          <b className="tabular-nums">{prevTop != null ? `${fmtKg(prevTop)} kg` : '—'}</b>
                        </>
                      ) : (
                        'Pierwszy raz'
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </li>
      ))}
    </ol>
  );
}
