import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useExerciseMap, useSessions } from '../db/hooks';
import type { Session } from '../db/types';
import { Button, Card, Content, Field, Header, Toggle, cx, inputCls } from '../components/ui';
import { QuickLog } from '../components/QuickLog';
import { applyQuickRows, rowsFromSession, type QuickRow } from '../logic/quick';

/** Poprawianie treningu zapisanego szybko: ciężary, pominięte ćwiczenia, data, cardio, notatka. */
export default function QuickEditScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercises = useExerciseMap();
  const sessions = useSessions();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [rows, setRows] = useState<QuickRow[]>([]);

  useEffect(() => {
    db.sessions.get(id!).then((s) => {
      setSession(s ?? null);
      if (s) setRows(rowsFromSession(s, false));
    });
  }, [id]);

  if (session === undefined || !exercises || !sessions) return null;
  if (session === null)
    return (
      <>
        <Header title="Trening" back="/historia" />
        <Content>
          <Card>Nie znaleziono treningu.</Card>
        </Content>
      </>
    );

  const save = async () => {
    await db.sessions.put(applyQuickRows({ ...session, note: session.note.trim() }, rows));
    navigate(`/historia/${session.id}`, { replace: true });
  };

  return (
    <>
      <Header title={`Popraw: ${session.templateName}`} back={`/historia/${session.id}`} />
      <Content>
        <Card>
          <Field label="Data">
            <input type="date" value={session.date} onChange={(e) => e.target.value && setSession({ ...session, date: e.target.value })} className={inputCls} />
          </Field>
        </Card>
        <Card>
          <QuickLog session={session} rows={rows} onChange={setRows} exercises={exercises} history={sessions} />
          {session.cardio.planned && (
            <div className="mt-2 border-t border-zinc-100 pt-1 dark:border-zinc-800">
              <Toggle
                checked={session.cardio.done}
                onChange={(done) => setSession({ ...session, cardio: { ...session.cardio, done } })}
                label={`🏃 Cardio${session.cardio.minutes ? ` ${session.cardio.minutes} min` : ''} zrobione`}
              />
            </div>
          )}
          <input
            value={session.note}
            onChange={(e) => setSession({ ...session, note: e.target.value })}
            placeholder="Notatka (opcjonalnie)"
            className={cx(inputCls, 'mt-2')}
          />
        </Card>
        <Button variant="primary" className="w-full text-lg" onClick={save}>
          Zapisz zmiany
        </Button>
      </Content>
    </>
  );
}
