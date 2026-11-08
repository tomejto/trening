import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useExercises } from '../db/hooks';
import { Card, Content, Header, inputCls } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';

export default function ExercisesScreen() {
  const exercises = useExercises();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  if (!exercises) return null;

  const filtered = exercises
    .filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(!!a.archived) - Number(!!b.archived) || a.name.localeCompare(b.name, 'pl'));

  const section = (title: string, part: 'upper' | 'lower') => {
    const list = filtered.filter((e) => e.bodyPart === part);
    if (list.length === 0) return null;
    return (
      <>
        <h2 className="px-1 pt-2 text-sm font-bold uppercase tracking-wide text-zinc-500">{title}</h2>
        <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
          {list.map((e) => (
            <Link key={e.id} to={`/cwiczenia/${e.id}`} className="flex min-h-13 items-center gap-2 px-3 py-2 active:bg-zinc-100 dark:active:bg-zinc-800">
              <span className={e.archived ? 'flex-1 text-zinc-400 line-through' : 'flex-1'}>{e.name}</span>
              <span className="text-xs text-zinc-500">{e.kind === 'compound' ? 'wielost.' : 'izol.'}</span>
              <span className="text-zinc-400">›</span>
            </Link>
          ))}
        </Card>
      </>
    );
  };

  return (
    <>
      <Header
        title="Ćwiczenia"
        back="/plan"
        right={
          <button onClick={() => setAdding(true)} className="rounded-lg px-2 py-2 text-sm font-semibold text-accent-600 dark:text-accent-400">
            + Nowe
          </button>
        }
      />
      <Content>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj ćwiczenia…" className={inputCls} />
        {section('Góra ciała', 'upper')}
        {section('Nogi', 'lower')}
      </Content>
      <ExercisePicker open={adding} onClose={() => setAdding(false)} onPick={(id) => navigate(`/cwiczenia/${id}`)} title="Nowe ćwiczenie" />
    </>
  );
}
