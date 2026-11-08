import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Button, Card, Content, Empty, Field, Header, Stepper, inputCls } from '../components/ui';
import { LineChart } from '../components/charts';
import { todayISO } from '../lib/dates';
import { fmtDateLong, fmtKg } from '../lib/format';
import { newId } from '../lib/ids';
import { movingAverage, sortByDate, weeklyRate } from '../logic/bodyweight';

export default function BodyWeightScreen() {
  const entries = useLiveQuery(() => db.bodyWeights.toArray());
  const [date, setDate] = useState(todayISO());
  const [kg, setKg] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!entries) return null;

  const sorted = sortByDate(entries);
  const last = sorted[sorted.length - 1];
  const value = kg ?? last?.kg ?? null;
  const avg = movingAverage(sorted);
  const rate = weeklyRate(sorted, todayISO());
  const ratePct = rate != null && last ? (rate / last.kg) * 100 : null;
  const existing = sorted.find((e) => e.date === date);

  const save = async () => {
    if (value == null || value <= 0) return;
    await db.bodyWeights.put({ id: existing?.id ?? newId(), date, kg: value });
    setKg(null);
  };

  const remove = async (id: string, d: string) => {
    if (confirm(`Usunąć pomiar z ${fmtDateLong(d)}?`)) await db.bodyWeights.delete(id);
  };

  const list = [...sorted].reverse();

  return (
    <>
      <Header title="Masa ciała" back="/wiecej" />
      <Content>
        <Card className="space-y-3">
          <div className="grid grid-cols-[1fr_1.2fr] gap-3">
            <Field label="Data">
              <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Masa (kg)">
              <Stepper value={value} step={0.1} min={20} onChange={setKg} placeholder="kg" />
            </Field>
          </div>
          <Button variant="primary" className="w-full" disabled={value == null} onClick={save}>
            {existing ? 'Popraw pomiar z tego dnia' : 'Zapisz pomiar'}
          </Button>
          <p className="text-xs text-zinc-500">Najlepiej waż się rano, po toalecie, przed jedzeniem – wtedy pomiary są porównywalne.</p>
        </Card>

        {sorted.length > 0 && (
          <Card>
            <div className="grid grid-cols-3 text-center">
              <Stat value={fmtKg(last.kg)} label="ostatni pomiar" />
              <Stat value={fmtKg(avg[avg.length - 1].value)} label="średnia 7 dni" />
              <Stat
                value={rate != null ? `${rate > 0 ? '+' : ''}${fmtKg(rate)}` : '—'}
                label={rate != null ? `kg/tydz. (${ratePct! > 0 ? '+' : ''}${fmtKg(Math.round(ratePct! * 100) / 100)}%)` : 'tempo (4 tyg.)'}
              />
            </div>
            {rate == null && <p className="mt-2 text-center text-xs text-zinc-500">Tempo pojawi się po min. 3 pomiarach z co najmniej tygodnia.</p>}
            <div className="mt-3">
              <LineChart
                series={[
                  { key: 'm', label: 'Pomiar', color: 'var(--series-1)', points: sorted.map((e) => ({ date: e.date, value: e.kg })) },
                  { key: 'a', label: 'Średnia 7 dni', color: 'var(--series-2)', points: avg },
                ]}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Tempo = trend z ostatnich 4 tygodni. Dzienne wahania (woda, jedzenie) są normalne – patrz na średnią.
            </p>
          </Card>
        )}

        <Card className="p-0">
          {list.length === 0 && <Empty>Brak pomiarów.</Empty>}
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {(showAll ? list : list.slice(0, 10)).map((e, i) => {
              const prev = list[i + 1];
              const diff = prev ? Math.round((e.kg - prev.kg) * 10) / 10 : null;
              return (
                <li key={e.id} className="flex items-center gap-2 pl-3">
                  <button onClick={() => { setDate(e.date); setKg(e.kg); }} className="flex min-h-12 flex-1 items-center gap-2 text-left">
                    <span className="flex-1 text-sm">{fmtDateLong(e.date)}</span>
                    <span className="font-semibold tabular-nums">{fmtKg(e.kg)} kg</span>
                    <span className="w-12 text-right text-xs tabular-nums text-zinc-500">{diff != null && diff !== 0 ? `${diff > 0 ? '+' : ''}${fmtKg(diff)}` : ''}</span>
                  </button>
                  <button aria-label="Usuń pomiar" onClick={() => remove(e.id, e.date)} className="h-12 w-11 text-lg text-zinc-400">
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
          {list.length > 10 && !showAll && (
            <button onClick={() => setShowAll(true)} className="min-h-12 w-full text-sm font-semibold text-accent-600 dark:text-accent-400">
              Pokaż wszystkie ({list.length})
            </button>
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
