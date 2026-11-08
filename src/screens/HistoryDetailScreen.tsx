import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useExerciseMap } from '../db/hooks';
import { Button, Card, Content, Header, cx } from '../components/ui';
import { fmtDateLong, fmtKg, fmtSets, repRange } from '../lib/format';
import { doneSets, groupBySuperset } from '../logic/workout';
import { epley1RM, sessionExerciseCount, sessionSetCount, sessionVolume } from '../logic/stats';
import { fmtDuration } from './HistoryScreen';

export default function HistoryDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercises = useExerciseMap();
  const session = useLiveQuery(async () => (await db.sessions.get(id!)) ?? null, [id]);

  if (session === undefined || !exercises) return null;
  if (session === null)
    return (
      <>
        <Header title="Trening" back="/historia" />
        <Content>
          <Card>Nie znaleziono treningu (mógł zostać usunięty).</Card>
        </Content>
      </>
    );

  const remove = async () => {
    if (!confirm(`Usunąć trening „${session.templateName}” z ${fmtDateLong(session.date)}? Tej operacji nie można cofnąć.`)) return;
    await db.sessions.delete(session.id);
    navigate('/historia', { replace: true });
  };

  const duration = fmtDuration(session);
  const volume = sessionVolume(session);

  return (
    <>
      <Header title={session.templateName} subtitle={fmtDateLong(session.date)} back="/historia" />
      <Content>
        {session.quick ? (
          <Card className="grid grid-cols-2 text-center">
            <Stat label="ćwiczeń zrobionych" value={`${sessionExerciseCount(session)} / ${session.entries.length}`} />
            <Stat label="cardio" value={session.cardio.done ? '✓' : '—'} />
          </Card>
        ) : (
          <Card className="grid grid-cols-3 text-center">
            <Stat label="serii" value={String(sessionSetCount(session))} />
            <Stat label="kg tonażu" value={volume > 0 ? fmtKg(Math.round(volume)) : '—'} />
            <Stat label="czas" value={duration ?? '—'} />
          </Card>
        )}

        {groupBySuperset(session.entries).map((group) => (
          <div key={group[0].id} className={cx(group.length > 1 && 'space-y-2 rounded-3xl border-2 border-accent-500/50 p-1.5')}>
            {group.length > 1 && <div className="px-2 text-xs font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">Superseria</div>}
            {group.map((e) => {
              const ex = exercises.get(e.exerciseId);
              const sets = doneSets(e);
              return (
                <Card key={e.id} className={cx(sets.length === 0 && 'opacity-60')}>
                  <div className="flex items-baseline gap-2">
                    <Link to={`/cwiczenia/${e.exerciseId}`} className="flex-1 font-bold">
                      {ex?.name ?? 'Nieznane ćwiczenie'}
                    </Link>
                    <span className="text-sm text-zinc-500">
                      cel {e.sets} × {repRange(e.repMin, e.repMax)}
                    </span>
                  </div>
                  {sets.length === 0 ? (
                    <p className="text-sm text-zinc-500">Pominięte</p>
                  ) : sets.every((s) => s.reps == null) ? (
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {fmtSets(sets)}
                      {ex?.unilateral && <span className="font-normal text-zinc-500"> /nogę</span>}
                    </p>
                  ) : (
                    <table className="mt-1 w-full text-sm tabular-nums">
                      <tbody>
                        {sets.map((s, i) => {
                          const e1 = s.reps == null ? null : epley1RM(s.weight as number, s.reps);
                          return (
                            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                              <td className="w-8 py-1 text-zinc-500">{i + 1}.</td>
                              <td className="py-1 font-semibold">
                                {fmtKg(s.weight)} kg × {s.reps ?? '?'}
                                {ex?.unilateral && <span className="font-normal text-zinc-500"> /nogę</span>}
                              </td>
                              <td className="py-1 text-right text-zinc-500">{e1 ? `1RM ≈ ${fmtKg(e1)}` : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </Card>
              );
            })}
          </div>
        ))}

        {(session.cardio.done || session.cardio.planned) && (
          <Card>
            <span className="font-bold">Cardio: </span>
            {session.cardio.done ? (
              <>
                ✓ {[session.cardio.type, session.cardio.minutes && `${session.cardio.minutes} min`].filter(Boolean).join(', ') || 'zrobione'}
              </>
            ) : (
              <span className="text-zinc-500">nie zrobione</span>
            )}
          </Card>
        )}

        {session.note && (
          <Card>
            <div className="text-sm font-semibold text-zinc-500">Notatka</div>
            <p className="whitespace-pre-wrap">{session.note}</p>
          </Card>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="text-red-600 dark:text-red-400" onClick={remove}>
            Usuń
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => navigate(session.quick ? `/historia/${session.id}/edytuj` : `/trening/${session.id}`)}>
            Edytuj trening
          </Button>
        </div>
      </Content>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
