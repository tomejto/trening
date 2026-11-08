import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useExerciseMap, useTemplates } from '../db/hooks';
import { Button, Card, Content, Header } from '../components/ui';
import { WEEKDAYS_LONG, WEEKDAY_ORDER } from '../lib/format';
import { newId } from '../lib/ids';

export default function PlanScreen() {
  const templates = useTemplates();
  const exercises = useExerciseMap();
  const navigate = useNavigate();
  if (!templates || !exercises) return null;

  const byDay = [...templates].sort((a, b) => {
    const da = a.weekday == null ? 99 : WEEKDAY_ORDER.indexOf(a.weekday);
    const dbb = b.weekday == null ? 99 : WEEKDAY_ORDER.indexOf(b.weekday);
    return da - dbb || a.order - b.order;
  });
  const usedDays = new Set(templates.map((t) => t.weekday));

  const addTemplate = async () => {
    const id = newId();
    await db.templates.add({
      id,
      name: 'Nowy trening',
      weekday: null,
      order: Math.max(-1, ...templates.map((t) => t.order)) + 1,
      cardio: { enabled: false, minutes: 20 },
      items: [],
    });
    navigate(`/plan/${id}`);
  };

  return (
    <>
      <Header
        title="Plan treningowy"
        right={
          <Link to="/cwiczenia" className="rounded-lg px-2 py-2 text-sm font-semibold text-accent-600 dark:text-accent-400">
            Ćwiczenia
          </Link>
        }
      />
      <Content>
        {byDay.map((t) => (
          <Link key={t.id} to={`/plan/${t.id}`} className="block">
            <Card>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
                  {t.weekday != null ? WEEKDAYS_LONG[t.weekday] : 'Bez dnia'}
                </span>
                <span className="flex-1" />
                <span className="text-sm text-zinc-500">{t.items.length} ćw.</span>
              </div>
              <div className="text-lg font-bold">
                {t.name}
                {t.subtitle && <span className="font-normal text-zinc-500"> ({t.subtitle})</span>}
                {t.cardio.enabled && <span className="text-base font-normal text-zinc-500"> + {t.cardio.minutes} min cardio</span>}
              </div>
              <div className="mt-1 line-clamp-2 text-sm text-zinc-500">
                {t.items.map((i) => exercises.get(i.exerciseId)?.name ?? '?').join(' · ')}
              </div>
            </Card>
          </Link>
        ))}
        <div className="px-1 text-sm text-zinc-500">
          Dni wolne: {WEEKDAY_ORDER.filter((d) => !usedDays.has(d)).map((d) => WEEKDAYS_LONG[d].toLowerCase()).join(', ') || 'brak'}
        </div>
        <Button className="w-full" onClick={addTemplate}>
          + Dodaj trening
        </Button>
      </Content>
    </>
  );
}
