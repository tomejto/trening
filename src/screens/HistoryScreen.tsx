import { Link } from 'react-router-dom';
import { useSessions } from '../db/hooks';
import { Card, Content, Empty, Header } from '../components/ui';
import { fmtDateLong, fmtKg, plural } from '../lib/format';
import { sessionExerciseCount, sessionSetCount, sessionVolume } from '../logic/stats';
import { parseISODate } from '../lib/dates';

function monthLabel(iso: string) {
  const s = parseISODate(iso).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDuration(s: { startedAt: number; finishedAt?: number }): string | null {
  if (!s.finishedAt) return null;
  const min = Math.round((s.finishedAt - s.startedAt) / 60000);
  if (min <= 0 || min > 600) return null;
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

export default function HistoryScreen() {
  const sessions = useSessions();
  if (!sessions) return null;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt);

  const months: { label: string; items: typeof sorted }[] = [];
  for (const s of sorted) {
    const label = monthLabel(s.date);
    if (months[months.length - 1]?.label !== label) months.push({ label, items: [] });
    months[months.length - 1].items.push(s);
  }

  return (
    <>
      <Header title="Historia" subtitle={sorted.length ? (() => { const n = sorted.filter((s) => s.status === 'done').length; return `${n} ${plural(n, 'trening', 'treningi', 'treningów')}`; })() : undefined} />
      <Content>
        {sorted.length === 0 && <Empty>Brak zapisanych treningów. Zacznij pierwszy na ekranie „Dziś”.</Empty>}
        {months.map((m) => (
          <div key={m.label} className="space-y-2">
            <h2 className="px-1 pt-2 text-sm font-bold uppercase tracking-wide text-zinc-500">{m.label}</h2>
            {m.items.map((s) => {
              const sets = sessionSetCount(s);
              const volume = sessionVolume(s);
              const duration = fmtDuration(s);
              return (
                <Link key={s.id} to={s.status === 'in_progress' ? `/trening/${s.id}` : `/historia/${s.id}`} className="block">
                  <Card>
                    <div className="flex items-baseline gap-2">
                      <span className="flex-1 font-bold">{s.templateName}</span>
                      {s.status === 'in_progress' && <span className="text-sm font-semibold text-accent-600 dark:text-accent-400">w toku</span>}
                      {s.isDeload && <span className="rounded-full bg-zinc-200 px-2 text-xs dark:bg-zinc-800">lżejszy</span>}
                    </div>
                    <div className="text-sm text-zinc-500">{fmtDateLong(s.date)}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
                      {s.quick ? (
                        <span>
                          {sessionExerciseCount(s)} {plural(sessionExerciseCount(s), 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
                        </span>
                      ) : (
                        <span>
                          {sets} {plural(sets, 'seria', 'serie', 'serii')}
                        </span>
                      )}
                      {volume > 0 && <span>{fmtKg(volume)} kg tonażu</span>}
                      {duration && <span>{duration}</span>}
                      {s.cardio.done && <span>🏃 cardio{s.cardio.minutes ? ` ${s.cardio.minutes} min` : ''}</span>}
                    </div>
                    {s.note && <p className="mt-1 line-clamp-2 text-sm italic text-zinc-500">„{s.note}”</p>}
                  </Card>
                </Link>
              );
            })}
          </div>
        ))}
      </Content>
    </>
  );
}
