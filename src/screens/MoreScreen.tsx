import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useSessions, useSettings } from '../db/hooks';
import type { Settings } from '../db/types';
import { Button, Card, Content, Field, Header, Stepper, Toggle } from '../components/ui';
import { useRestTimer } from '../timer/RestTimer';
import { deloadStatus } from '../logic/deload';
import { BackupError, backupFileName, exportData, importData, parseBackup, summarizeBackup } from '../logic/backup';
import { parseISODate, todayISO, weekStart } from '../lib/dates';
import { fmtDateLong, fmtKg, plural } from '../lib/format';
import { sortByDate } from '../logic/bodyweight';

const fmtDateYear = (iso: string) => parseISODate(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pt-2 text-sm font-bold uppercase tracking-wide text-zinc-500">{children}</h2>;
}

export default function MoreScreen() {
  const settings = useSettings();
  const sessions = useSessions();
  const weights = useLiveQuery(() => db.bodyWeights.toArray());
  const timer = useRestTimer();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!settings || !sessions || !weights) return null;

  const update = (patch: Partial<Settings>) => db.settings.put({ ...settings, ...patch });
  const today = todayISO();
  const deload = deloadStatus(sessions, settings, today);
  const lastWeight = sortByDate(weights).at(-1);
  const daysSinceBackup = settings.lastBackupAt ? Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000) : null;
  const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });

  const makeFile = async () => {
    const file = await exportData(db);
    return new File([JSON.stringify(file)], backupFileName(), { type: 'application/json' });
  };

  const markBackup = () => update({ lastBackupAt: Date.now() });

  const download = async () => {
    const f = await makeFile();
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    await markBackup();
    setMsg({ ok: true, text: `Zapisano plik ${f.name}.` });
  };

  const share = async () => {
    const f = await makeFile();
    try {
      await navigator.share({ files: [f], title: 'Kopia treningów' });
      await markBackup();
      setMsg({ ok: true, text: 'Kopia udostępniona.' });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg({ ok: false, text: 'Nie udało się udostępnić pliku – spróbuj „Pobierz plik”.' });
    }
  };

  const onImport = async (file: File) => {
    setMsg(null);
    try {
      const backup = parseBackup(await file.text());
      const s = summarizeBackup(backup);
      const range = s.firstDate ? ` (${fmtDateYear(s.firstDate)} – ${fmtDateYear(s.lastDate!)})` : '';
      const ok = confirm(
        `Kopia zawiera: ${s.sessions} ${plural(s.sessions, 'trening', 'treningi', 'treningów')}${range}, ${s.exercises} ${plural(s.exercises, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}, ${s.bodyWeights} ${plural(s.bodyWeights, 'pomiar', 'pomiary', 'pomiarów')} masy.\n\n` +
          'Import ZASTĄPI wszystkie obecne dane w aplikacji. Kontynuować?',
      );
      if (!ok) return;
      await importData(db, backup);
      setMsg({ ok: true, text: 'Dane zaimportowane.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BackupError ? e.message : 'Import nie powiódł się – dane nie zostały zmienione.' });
    }
  };

  const resetAll = async () => {
    const n = sessions.filter((s) => s.status === 'done').length;
    if (!confirm(`Usunąć WSZYSTKIE dane (${n} ${plural(n, 'trening', 'treningi', 'treningów')} w historii, masa ciała, zmiany w planie)?\n\nTego nie da się cofnąć. Jeśli chcesz je zachować, najpierw zrób kopię zapasową.`)) return;
    timer.stop();
    try {
      localStorage.clear();
    } catch {
      /* ignoruj */
    }
    await db.delete();
    location.hash = '#/';
    location.reload();
  };

  return (
    <>
      <Header title="Więcej" />
      <Content>
        <Link to="/masa" className="block">
          <Card className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <div className="flex-1">
              <div className="font-bold">Masa ciała</div>
              <div className="text-sm text-zinc-500">
                {lastWeight ? `Ostatnio ${fmtKg(lastWeight.kg)} kg · ${fmtDateLong(lastWeight.date)}` : 'Dodaj pierwszy pomiar'}
              </div>
            </div>
            <span className="text-zinc-400">›</span>
          </Card>
        </Link>

        <SectionTitle>Lżejszy tydzień</SectionTitle>
        <Card className="space-y-3">
          <p className="text-sm">
            {deload.activeThisWeek
              ? '🔋 Ten tydzień jest lżejszy.'
              : `Obecnie: tydzień ${deload.currentWeekNumber} cyklu (${deload.weeksSinceDeload} ${plural(deload.weeksSinceDeload, 'zakończony tydzień', 'zakończone tygodnie', 'zakończonych tygodni')} treningowych od ostatniego odciążenia).`}
          </p>
          <Field label="Przypominaj co (tygodni treningowych)">
            <Stepper value={settings.deloadEveryWeeks} min={2} allowDecimal={false} onChange={(v) => update({ deloadEveryWeeks: Math.min(16, v ?? 7) })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serii mniej">
              <Stepper value={settings.deloadSetDelta} min={0} allowDecimal={false} onChange={(v) => update({ deloadSetDelta: Math.min(5, v ?? 1) })} />
            </Field>
            <Field label="Ciężar (%)">
              <Stepper value={settings.deloadWeightPct} step={5} min={50} allowDecimal={false} onChange={(v) => update({ deloadWeightPct: Math.min(100, v ?? 90) })} />
            </Field>
          </div>
          <Toggle
            checked={deload.activeThisWeek}
            onChange={(on) => update({ lastDeloadWeekStart: on ? weekStart(today) : undefined })}
            label="Lżejszy tydzień teraz"
            hint="Nowe treningi w tym tygodniu startują z mniejszą liczbą serii i ciężarem"
          />
        </Card>

        <SectionTitle>Timer przerwy</SectionTitle>
        <Card className="space-y-3">
          <Field label="Ćwiczenia wielostawowe (s)">
            <Stepper value={settings.restCompoundSec} step={15} min={15} allowDecimal={false} onChange={(v) => update({ restCompoundSec: v ?? 150 })} />
          </Field>
          <Field label="Izolacje (s)">
            <Stepper value={settings.restIsolationSec} step={15} min={15} allowDecimal={false} onChange={(v) => update({ restIsolationSec: v ?? 75 })} />
          </Field>
          <p className="text-sm text-zinc-500">Własny czas dla konkretnego ćwiczenia ustawisz na jego karcie (Plan → Ćwiczenia).</p>
          <Toggle checked={settings.sound} onChange={(sound) => update({ sound })} label="Dźwięk na koniec przerwy" />
          <Toggle
            checked={settings.vibration}
            onChange={(vibration) => update({ vibration })}
            label="Wibracja na koniec przerwy"
            hint={'vibrate' in navigator ? undefined : 'Ta przeglądarka nie obsługuje wibracji (np. iPhone)'}
          />
          <Button className="w-full" onClick={() => timer.start(5, 'test dźwięku')}>
            Testuj (5 s)
          </Button>
        </Card>

        <SectionTitle>Kopia zapasowa</SectionTitle>
        <Card className="space-y-3">
          <p className={daysSinceBackup == null || daysSinceBackup > 14 ? 'text-sm font-medium text-amber-700 dark:text-amber-400' : 'text-sm text-zinc-500'}>
            {daysSinceBackup == null
              ? 'Nie zrobiono jeszcze kopii. Dane są tylko na tym telefonie – zrób kopię co jakiś czas.'
              : `Ostatnia kopia: ${daysSinceBackup === 0 ? 'dziś' : `${daysSinceBackup} ${plural(daysSinceBackup, 'dzień', 'dni', 'dni')} temu`}.`}
          </p>
          {canShareFiles && (
            <Button variant="primary" className="w-full" onClick={share}>
              Udostępnij / zapisz w Plikach
            </Button>
          )}
          <Button variant={canShareFiles ? 'secondary' : 'primary'} className="w-full" onClick={download}>
            Pobierz plik kopii (JSON)
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
            Importuj z pliku…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void onImport(f);
            }}
          />
          {msg && <p className={msg.ok ? 'text-sm text-accent-700 dark:text-accent-400' : 'text-sm text-red-600 dark:text-red-400'}>{msg.text}</p>}
        </Card>

        <SectionTitle>Dane</SectionTitle>
        <Card className="space-y-2">
          <p className="text-sm text-zinc-500">Usuwa historię, masę ciała, zmiany w planie i ustawienia. Aplikacja wraca do stanu z pierwszego uruchomienia.</p>
          <Button variant="danger" className="w-full" onClick={resetAll}>
            Usuń wszystkie dane
          </Button>
        </Card>

        <p className="pt-4 text-center text-xs text-zinc-400">Mój Trening · dane zapisane lokalnie na tym urządzeniu</p>
      </Content>
    </>
  );
}
