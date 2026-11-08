import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../db/hooks';
import { cx } from '../components/ui';

/* ---------- Dźwięk ---------- */
// AudioContext musi zostać odblokowany gestem użytkownika (iOS) – robimy to przy zatwierdzeniu serii.
// Sygnał końca planujemy z wyprzedzeniem w czasie AudioContext, więc zagra nawet przy przyciętych timerach JS.

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;
let scheduled: OscillatorNode[] = [];

export function unlockAudio() {
  try {
    const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* brak dźwięku – trudno */
  }
}

function cancelBeeps() {
  for (const o of scheduled) {
    try {
      o.stop();
    } catch {
      /* już zatrzymany */
    }
  }
  scheduled = [];
}

function scheduleBeeps(delaySec: number) {
  cancelBeeps();
  if (!ctx || delaySec < 0) return;
  const t0 = ctx.currentTime + delaySec;
  for (let i = 0; i < 3; i++) {
    const start = t0 + i * 0.4;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1175 : 880;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.32);
    scheduled.push(osc);
  }
}

/* ---------- Stan timera ---------- */

interface TimerState {
  endAt: number;
  total: number;
  label: string;
}

interface TimerApi {
  state: TimerState | null;
  start: (seconds: number, label: string) => void;
  adjust: (deltaSec: number) => void;
  stop: () => void;
}

const STORAGE_KEY = 'restTimer';
const TimerContext = createContext<TimerApi | null>(null);

function loadState(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TimerState;
    // Stary, dawno zakończony timer nie ma sensu po ponownym otwarciu.
    return Date.now() - s.endAt > 60_000 ? null : s;
  } catch {
    return null;
  }
}

function saveState(s: TimerState | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* tryb prywatny itp. */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [state, setState] = useState<TimerState | null>(loadState);
  const soundOn = settings?.sound ?? true;

  const apply = useCallback(
    (next: TimerState | null) => {
      setState(next);
      saveState(next);
      if (next && soundOn) scheduleBeeps((next.endAt - Date.now()) / 1000);
      else cancelBeeps();
    },
    [soundOn],
  );

  // Po powrocie do aplikacji przeplanuj dźwięk wg zegara ściennego (AudioContext mógł być wstrzymany).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      const s = loadState();
      if (s && s.endAt > Date.now() && soundOn) {
        unlockAudio();
        scheduleBeeps((s.endAt - Date.now()) / 1000);
      } else cancelBeeps();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [soundOn]);

  const api = useMemo<TimerApi>(
    () => ({
      state,
      start: (seconds, label) => {
        unlockAudio();
        apply({ endAt: Date.now() + seconds * 1000, total: seconds, label });
      },
      adjust: (delta) => {
        if (!state) return;
        const endAt = Math.max(Date.now(), state.endAt + delta * 1000);
        apply({ ...state, endAt, total: Math.max(1, state.total + delta) });
      },
      stop: () => apply(null),
    }),
    [state, apply],
  );

  return <TimerContext.Provider value={api}>{children}</TimerContext.Provider>;
}

export function useRestTimer(): TimerApi {
  const api = useContext(TimerContext);
  if (!api) throw new Error('useRestTimer poza RestTimerProvider');
  return api;
}

/* ---------- Pasek timera ---------- */

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function RestTimerBar() {
  const { state, adjust, stop } = useRestTimer();
  const settings = useSettings();
  const [now, setNow] = useState(Date.now());
  const vibrated = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state]);

  const remaining = state ? (state.endAt - now) / 1000 : 0;
  const finished = !!state && remaining <= 0;

  // Wibracja na koniec (Android; iOS nie obsługuje Vibration API).
  useEffect(() => {
    if (!state || !finished || vibrated.current === state.endAt) return;
    vibrated.current = state.endAt;
    if (settings?.vibration !== false) navigator.vibrate?.([400, 150, 400, 150, 400]);
  }, [finished, state, settings?.vibration]);

  // Zakończony timer chowa się sam po 20 s.
  useEffect(() => {
    if (finished && remaining < -20) stop();
  }, [finished, remaining, stop]);

  if (!state) return null;
  const progress = Math.min(1, Math.max(0, 1 - remaining / state.total));

  return (
    <div
      className={cx(
        'fixed inset-x-0 z-40 mx-auto max-w-xl px-2 pb-2',
        'bottom-[calc(4rem+env(safe-area-inset-bottom))]',
      )}
      role="timer"
      aria-live="polite"
    >
      <div
        className={cx(
          'overflow-hidden rounded-2xl border shadow-lg',
          finished
            ? 'border-accent-600 bg-accent-400 text-zinc-950'
            : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        )}
      >
        <div className="flex items-center gap-2 px-2 py-2">
          {finished ? (
            <>
              <div className="flex-1 pl-2">
                <div className="text-xl font-extrabold">Czas na serię! 💪</div>
                <div className="truncate text-sm opacity-80">{state.label}</div>
              </div>
              <button onClick={stop} className="min-h-12 rounded-xl bg-zinc-950/15 px-5 text-lg font-bold">
                OK
              </button>
            </>
          ) : (
            <>
              <button onClick={() => adjust(-15)} className="h-12 w-14 shrink-0 rounded-xl bg-zinc-100 font-semibold active:bg-zinc-300 dark:bg-zinc-800 dark:active:bg-zinc-700">
                −15
              </button>
              <div className="min-w-0 flex-1 text-center">
                <div className="text-3xl font-extrabold tabular-nums leading-none">{fmtClock(remaining)}</div>
                <div className="truncate text-xs text-zinc-500">Przerwa · {state.label}</div>
              </div>
              <button onClick={() => adjust(15)} className="h-12 w-14 shrink-0 rounded-xl bg-zinc-100 font-semibold active:bg-zinc-300 dark:bg-zinc-800 dark:active:bg-zinc-700">
                +15
              </button>
              <button onClick={stop} className="h-12 shrink-0 rounded-xl px-3 font-semibold text-zinc-500 active:bg-zinc-200 dark:active:bg-zinc-800">
                Pomiń
              </button>
            </>
          )}
        </div>
        {!finished && (
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full bg-accent-500 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Utrzymuje ekran włączony podczas treningu (Screen Wake Lock API). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        /* np. niski poziom baterii */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, [active]);
}
