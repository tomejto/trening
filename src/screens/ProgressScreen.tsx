import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useExerciseMap, useSessions, useTemplates } from '../db/hooks';
import { Card, Content, Empty, Header, cx, inputCls } from '../components/ui';
import { BarChart, LineChart, exerciseChartSeries } from '../components/charts';
import { exerciseSeries, exercisesWithHistory, weeklyStats } from '../logic/stats';
import { todayISO } from '../lib/dates';
import { fmtDateShort, fmtKg } from '../lib/format';

const WEEKS = 8;

export default function ProgressScreen() {
  const sessions = useSessions();
  const exercises = useExerciseMap();
  const templates = useTemplates();
  const [picked, setPicked] = useState<string | null>(null);
  if (!sessions || !exercises || !templates) return null;

  const weeks = weeklyStats(sessions, WEEKS, todayISO());
  const thisWeek = weeks[weeks.length - 1];
  const plannedPerWeek = templates.filter((t) => t.weekday != null).length;
  const avgWorkouts = weeks.slice(0, -1).reduce((n, w) => n + w.workouts, 0) / (WEEKS - 1);

  const withHistory = exercisesWithHistory(sessions);
  const selectedId = picked ?? withHistory[0]?.exerciseId;
  const series = selectedId ? exerciseSeries(sessions, selectedId) : [];
  const bestWeight = series.length ? Math.max(...series.map((p) => p.bestWeight)) : null;
  const e1rms = series.map((p) => p.bestE1RM).filter((v): v is number => v != null);
  const bestE1RM = e1rms.length ? Math.max(...e1rms) : null;
  const hasVolume = weeks.some((w) => w.volume > 0);
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <>
      <Header title="Postępy" />
      <Content>
        <Card>
          <h2 className="mb-2 text-lg font-bold">Ten tydzień</h2>
          <div className={cx('grid text-center', hasVolume ? 'grid-cols-3' : 'grid-cols-2')}>
            <Stat value={`${thisWeek.workouts}${plannedPerWeek ? `/${plannedPerWeek}` : ''}`} label="treningi" />
            <Stat value={String(thisWeek.sets)} label="serii" />
            {hasVolume && <Stat value={thisWeek.volume > 0 ? fmtKg(Math.round(thisWeek.volume)) : '0'} label="kg tonażu" />}
          </div>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Średnio {fmtKg(Math.round(avgWorkouts * 10) / 10)} treningu/tydz. w poprzednich {WEEKS - 1} tygodniach
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Serie w tygodniu</h2>
          <p className="mb-2 text-sm text-zinc-500">Ostatnie {WEEKS} tygodni · dotknij słupka po szczegóły</p>
          <BarChart
            data={weeks.map((w) => ({
              key: w.weekStart,
              label: fmtDateShort(w.weekStart),
              value: w.sets,
              detail: (
                <>
                  <div className="font-semibold">Tydzień od {fmtDateShort(w.weekStart)}</div>
                  <div>Treningi: {w.workouts}</div>
                  <div>Serie: {w.sets}</div>
                  {w.volume > 0 && <div>Tonaż: {fmtKg(Math.round(w.volume))} kg</div>}
                </>
              ),
            }))}
          />
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold">Ćwiczenie</h2>
          {withHistory.length === 0 ? (
            <Empty>Wykresy pojawią się po pierwszym zapisanym treningu.</Empty>
          ) : (
            <>
              <select value={selectedId} onChange={(e) => setPicked(e.target.value)} className={inputCls}>
                {withHistory.map((h) => (
                  <option key={h.exerciseId} value={h.exerciseId}>
                    {exercises.get(h.exerciseId)?.name ?? '?'} ({h.sessions})
                  </option>
                ))}
              </select>

              <div className={cx('my-3 grid text-center', bestE1RM != null ? 'grid-cols-3' : 'grid-cols-2')}>
                <Stat value={bestWeight != null ? fmtKg(bestWeight) : '—'} label="rekord kg" />
                {bestE1RM != null && <Stat value={fmtKg(bestE1RM)} label="najlepszy 1RM" />}
                <Stat
                  value={first && last && series.length > 1 ? `${last.bestWeight - first.bestWeight >= 0 ? '+' : ''}${fmtKg(last.bestWeight - first.bestWeight)}` : '—'}
                  label={first ? `kg od ${fmtDateShort(first.date)}` : 'zmiana'}
                />
              </div>

              <LineChart series={exerciseChartSeries(series)} />
              {bestE1RM != null && <p className="mt-1 text-xs text-zinc-500">1RM szacowany wzorem Epleya: ciężar × (1 + powtórzenia/30).</p>}
              {selectedId && (
                <Link to={`/cwiczenia/${selectedId}`} className="mt-2 inline-block text-sm font-semibold text-accent-600 dark:text-accent-400">
                  Karta ćwiczenia i ostatnie wyniki ›
                </Link>
              )}
            </>
          )}
        </Card>
      </Content>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
