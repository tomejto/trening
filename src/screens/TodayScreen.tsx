import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useExerciseMap, useSessions, useSettings, useTemplates } from '../db/hooks';
import type { Exercise, Session, Settings, WorkoutTemplate } from '../db/types';
import { Button, Card, Content, Empty, Header, Toggle, cx, inputCls } from '../components/ui';
import { QuickLog } from '../components/QuickLog';
import { todayISO, weekStart } from '../lib/dates';
import { deloadStatus, toDeloadSession, type DeloadStatus } from '../logic/deload';
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, fmtDateLong, plural } from '../lib/format';
import { createSessionFromTemplate, templateForWeekday } from '../logic/workout';
import { applyQuickRows, rowsFromSession, type QuickRow } from '../logic/quick';

export default function TodayScreen() {
  const templates = useTemplates();
  const sessions = useSessions();
  const exercises = useExerciseMap();
  const settings = useSettings();
  const navigate = useNavigate();
  const today = todayISO();
  const weekday = new Date().getDay();
  // jeśli dziś zaczęto wypełniać inny trening niż ten z dnia tygodnia, wracamy do niego
  const [pickedId, setPickedId] = useState<string | null>(() => draftTemplateId(today));

  if (!templates || !sessions || !exercises || !settings) return null;

  const scheduled = templateForWeekday(templates, weekday);
  const selected = templates.find((t) => t.id === (pickedId ?? scheduled?.id));
  const inProgress = sessions.find((s) => s.status === 'in_progress');
  const doneToday = sessions.filter((s) => s.date === today && s.status === 'done');
  const deload = deloadStatus(sessions, settings, today);
  const doneTodaySelected = doneToday.find((s) => s.templateId === selected?.id);

  const start = async () => {
    if (!selected) return;
    let session = createSessionFromTemplate(selected, sessions, today, Date.now(), exercises);
    if (deload.activeThisWeek) session = toDeloadSession(session, (id) => exercises.get(id)?.weightStep ?? 2.5, settings);
    await db.sessions.add(session);
    navigate(`/trening/${session.id}`);
  };

  return (
    <>
      <Header
        title="Dziś"
        subtitle={
          <span>
            {fmtDateLong(today)} · {deload.activeThisWeek ? 'lżejszy tydzień' : `tydzień ${deload.currentWeekNumber} cyklu`}
          </span>
        }
      />
      <Content>
        <DeloadCard status={deload} settings={settings} sessions={sessions} today={today} />

        {inProgress && (
          <Card className="border-accent-500 bg-accent-50 dark:border-accent-700 dark:bg-accent-950">
            <div className="mb-2 font-semibold">Trening w toku: {inProgress.templateName}</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="text-red-600 dark:text-red-400"
                onClick={async () => {
                  if (confirm(`Odrzucić trening w toku „${inProgress.templateName}”? Wpisane w nim serie zostaną usunięte.`)) await db.sessions.delete(inProgress.id);
                }}
              >
                Odrzuć
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => navigate(`/trening/${inProgress.id}`)}>
                Kontynuuj trening
              </Button>
            </div>
          </Card>
        )}

        {doneToday.map((s) => (
          <Link key={s.id} to={`/historia/${s.id}`} className="block">
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-xl text-white dark:text-zinc-950">✓</span>
              <div>
                <div className="font-semibold">Zrobione: {s.templateName}</div>
                <div className="text-sm text-zinc-500">Dotknij, aby zobaczyć szczegóły</div>
              </div>
            </Card>
          </Link>
        ))}

        {/* Wybór treningu – domyślnie przypisany do dnia tygodnia */}
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {templates.map((t) => {
            const active = t.id === selected?.id;
            return (
              <button
                key={t.id}
                onClick={() => setPickedId(t.id)}
                className={cx(
                  'min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold',
                  active
                    ? 'border-accent-500 bg-accent-500 text-white dark:text-zinc-950'
                    : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900',
                )}
              >
                {t.weekday != null && <span className="opacity-70">{WEEKDAYS_SHORT[t.weekday]} · </span>}
                {t.name}
              </button>
            );
          })}
        </div>

        {!selected ? (
          <Card>
            <div className="py-4 text-center">
              <div className="text-4xl">😌</div>
              <div className="mt-2 text-lg font-semibold">{WEEKDAYS_LONG[weekday]} – dzień wolny</div>
              <p className="mt-1 text-zinc-500">Jeśli przesuwasz trening, wybierz go powyżej.</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="mb-3 flex items-start gap-2">
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <div className="text-sm text-zinc-500">
                  {[selected.subtitle, selected.cardio.enabled && `+ ${selected.cardio.minutes} min cardio`, selected.id !== scheduled?.id && 'poza planem dnia']
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <Link to={`/plan/${selected.id}`} className="rounded-lg px-2 py-1 text-sm font-semibold text-accent-600 dark:text-accent-400">
                Edytuj
              </Link>
            </div>
            {selected.items.length === 0 ? (
              <Empty>Ten trening nie ma jeszcze ćwiczeń.</Empty>
            ) : doneTodaySelected ? (
              <div className="space-y-3">
                <p className="text-zinc-500">✓ Ten trening jest dziś zapisany.</p>
                <Button className="w-full" onClick={() => navigate(`/historia/${doneTodaySelected.id}`)}>
                  Pokaż / popraw zapis
                </Button>
              </div>
            ) : (
              <QuickWorkout
                key={selected.id}
                template={selected}
                sessions={sessions}
                exercises={exercises}
                settings={settings}
                deloadActive={deload.activeThisWeek}
                today={today}
              />
            )}
            {selected.items.length > 0 && !doneTodaySelected && !inProgress && (
              <button
                type="button"
                onClick={start}
                className="mt-2 block w-full py-2 text-center text-sm font-semibold text-zinc-500 underline-offset-2 active:underline"
              >
                Szczegółowo: serie, powtórzenia i timer ›
              </button>
            )}
          </Card>
        )}
      </Content>
    </>
  );
}

const DRAFT_KEY = 'quickDraft';

interface QuickDraft {
  date: string;
  session: Session;
  rows: QuickRow[];
  cardioDone: boolean;
  note: string;
}

function readDraft(today: string): QuickDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as QuickDraft | null;
    return d && d.date === today ? d : null;
  } catch {
    return null;
  }
}

const draftTemplateId = (today: string) => readDraft(today)?.session.templateId ?? null;

function loadDraft(templateId: string, today: string): QuickDraft | null {
  const d = readDraft(today);
  return d && d.session.templateId === templateId ? d : null;
}

/** Szybki zapis treningu: ciężar przy każdym ćwiczeniu + „Zapisz trening”. Szkic przeżywa zamknięcie aplikacji. */
function QuickWorkout({
  template,
  sessions,
  exercises,
  settings,
  deloadActive,
  today,
}: {
  template: WorkoutTemplate;
  sessions: Session[];
  exercises: Map<string, Exercise>;
  settings: Settings;
  deloadActive: boolean;
  today: string;
}) {
  const [draft, setDraft] = useState<QuickDraft>(() => {
    const saved = loadDraft(template.id, today);
    if (saved) return saved;
    let session = createSessionFromTemplate(template, sessions, today, Date.now(), exercises);
    if (deloadActive) session = toDeloadSession(session, (id) => exercises.get(id)?.weightStep ?? 2.5, settings);
    return { date: today, session, rows: rowsFromSession(session, true), cardioDone: false, note: '' };
  });
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<QuickDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* brak pamięci – szkic tylko w tej sesji */
    }
  };

  const save = async () => {
    const missing = draft.rows.filter((r) => r.done && r.weight == null).map((r) => exercises.get(r.exerciseId)?.name ?? '?');
    if (missing.length && !confirm(`Bez wpisanego ciężaru: ${missing.join(', ')}.\n\nZapisać jako „bez obciążenia”?`)) return;
    setSaving(true);
    const now = Date.now();
    const session = applyQuickRows(
      { ...draft.session, quick: true, status: 'done', startedAt: now, finishedAt: now, note: draft.note.trim(), cardio: { ...draft.session.cardio, done: draft.cardioDone } },
      draft.rows,
    );
    await db.sessions.add(session);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignoruj */
    }
  };

  const doneCount = draft.rows.filter((r) => r.done).length;

  return (
    <div>
      {draft.session.isDeload && (
        <p className="mb-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800/70">🔋 Lżejszy tydzień – ciężary obniżone do ok. {settings.deloadWeightPct}%.</p>
      )}
      <QuickLog session={draft.session} rows={draft.rows} onChange={(rows) => update({ rows })} exercises={exercises} history={sessions} />
      {template.cardio.enabled && (
        <div className="mt-2 border-t border-zinc-100 pt-1 dark:border-zinc-800">
          <Toggle checked={draft.cardioDone} onChange={(cardioDone) => update({ cardioDone })} label={`🏃 Cardio ${template.cardio.minutes} min zrobione`} />
        </div>
      )}
      <input
        value={draft.note}
        onChange={(e) => update({ note: e.target.value })}
        placeholder="Notatka (opcjonalnie)"
        className={cx(inputCls, 'mt-2')}
      />
      <Button variant="primary" className="mt-3 w-full text-lg" disabled={saving || doneCount === 0} onClick={save}>
        ✓ Zapisz trening
      </Button>
    </div>
  );
}

function DeloadCard({ status, settings, sessions, today }: { status: DeloadStatus; settings: Settings; sessions: Session[]; today: string }) {
  const week = weekStart(today);
  const save = (patch: Partial<Settings>) => db.settings.put({ ...settings, ...patch });
  const n = settings.deloadSetDelta;
  const lighter = `${n > 0 ? `o ${n} ${plural(n, 'serię', 'serie', 'serii')} mniej` : 'tyle samo serii'}, ciężar ok. ${settings.deloadWeightPct}%`;

  if (status.activeThisWeek) {
    const loggedDeload = sessions.some((s) => s.isDeload && weekStart(s.date) === week);
    return (
      <Card className="border-sky-400/60 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40">
        <div className="font-semibold">🔋 Lżejszy tydzień</div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">W tym tygodniu każdy trening startuje lżej: {lighter}. Skup się na technice.</p>
        {!loggedDeload && (
          <button onClick={() => save({ lastDeloadWeekStart: undefined })} className="mt-1 min-h-10 text-sm font-semibold text-sky-700 dark:text-sky-400">
            Wyłącz lżejszy tydzień
          </button>
        )}
      </Card>
    );
  }
  if (!status.shouldRemind) return null;
  return (
    <Card className="border-sky-400/60 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40">
      <div className="text-lg font-bold">🔋 Czas na lżejszy tydzień?</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Za Tobą {status.weeksSinceDeload} {plural(status.weeksSinceDeload, 'tydzień treningowy', 'tygodnie treningowe', 'tygodni treningowych')} od ostatniego odciążenia. Lżejszy tydzień ({lighter}) pozwala się zregenerować i wrócić
        mocniej.
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" onClick={() => save({ deloadDismissedWeek: week })}>
          Nie teraz
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => save({ lastDeloadWeekStart: week })}>
          Włącz w tym tygodniu
        </Button>
      </div>
    </Card>
  );
}
