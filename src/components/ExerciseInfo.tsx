import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import type { Exercise, ExerciseDescription } from '../db/types';
import { cx, inputCls } from './ui';

export function hasDescription(d: ExerciseDescription) {
  return !!(d.muscles || d.setup || d.steps.length || d.mistakes.length || d.tips.length);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">{title}</h3>
      {children}
    </div>
  );
}

export function DescriptionView({ d }: { d: ExerciseDescription }) {
  return (
    <div className="leading-relaxed">
      {d.muscles && (
        <Section title="Pracujące mięśnie">
          <p>{d.muscles}</p>
        </Section>
      )}
      {d.setup && (
        <Section title="Ustawienie">
          <p>{d.setup}</p>
        </Section>
      )}
      {d.steps.length > 0 && (
        <Section title="Wykonanie">
          <ol className="list-decimal space-y-1 pl-5">
            {d.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Section>
      )}
      {d.mistakes.length > 0 && (
        <Section title="Najczęstsze błędy">
          <ul className="space-y-1">
            {d.mistakes.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>✗</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {d.tips.length > 0 && (
        <Section title="Wskazówki">
          <ul className="space-y-1">
            {d.tips.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>💡</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/** Pole notatek zapisujące od razu do bazy; stan lokalny, żeby kursor nie skakał przy pisaniu. */
export function NotesField({ exercise, rows = 3 }: { exercise: Exercise; rows?: number }) {
  const [text, setText] = useState(exercise.userNotes);
  const idRef = useRef(exercise.id);
  useEffect(() => {
    if (idRef.current !== exercise.id) {
      idRef.current = exercise.id;
      setText(exercise.userNotes);
    }
  }, [exercise.id, exercise.userNotes]);
  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        db.exercises.update(exercise.id, { userNotes: e.target.value });
      }}
      rows={rows}
      placeholder="np. siedzisko na 4, oparcie na 2"
      className={cx(inputCls, 'py-2')}
    />
  );
}

/** Rozwijany panel przy ćwiczeniu w trakcie treningu: notatki zawsze widoczne, opis techniki po rozwinięciu. */
export function ExerciseInfoPanel({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      {!open && exercise.userNotes.trim() && (
        <p className="mb-1 whitespace-pre-line text-sm">
          <span aria-hidden>📝 </span>
          {exercise.userNotes}
        </p>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-zinc-200 px-3 text-left text-sm font-semibold dark:border-zinc-700"
      >
        <span aria-hidden>📖</span>
        <span className="flex-1">Technika i notatki</span>
        <span className="text-zinc-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
          <label className="block">
            <span className="mb-1 block font-semibold">📝 Moje notatki</span>
            <NotesField exercise={exercise} rows={2} />
          </label>
          {hasDescription(exercise.description) ? <DescriptionView d={exercise.description} /> : <p className="text-zinc-500">Brak opisu techniki.</p>}
          <Link to={`/cwiczenia/${exercise.id}`} className="inline-block font-semibold text-accent-600 dark:text-accent-400">
            Karta ćwiczenia: postępy i edycja opisu ›
          </Link>
        </div>
      )}
    </div>
  );
}
