import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmtKg, parseNum } from '../lib/format';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

/* ---------- Układ strony ---------- */

export function Header({ title, subtitle, back, right }: { title: ReactNode; subtitle?: ReactNode; back?: string | true; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-zinc-200 bg-zinc-100/90 backdrop-blur dark:border-zinc-800 dark:bg-[#0b0d10]/90">
      <div className="flex min-h-14 items-center gap-2 px-3">
        {back && (
          <button
            aria-label="Wstecz"
            onClick={() => (back === true ? navigate(-1) : navigate(back))}
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-2xl active:bg-zinc-200 dark:active:bg-zinc-800"
          >
            ‹
          </button>
        )}
        <div className="min-w-0 flex-1 py-2">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <div className="truncate text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</div>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Content({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx('mx-auto w-full max-w-xl space-y-3 px-3 py-3', className)}>{children}</main>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900', className)}>
      {children}
    </section>
  );
}

/* ---------- Przyciski ---------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-accent-500 text-white active:bg-accent-600 dark:bg-accent-500 dark:text-zinc-950 dark:active:bg-accent-400',
  secondary: 'bg-zinc-200 text-zinc-900 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700',
  ghost: 'text-zinc-700 active:bg-zinc-200 dark:text-zinc-300 dark:active:bg-zinc-800',
  danger: 'bg-red-600 text-white active:bg-red-700',
};

export function Button({
  children,
  variant = 'secondary',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors disabled:opacity-40',
        btnVariants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Pola liczbowe ---------- */

/** Pole tekstowe z klawiaturą numeryczną; akceptuje przecinek. */
export function NumInput({
  value,
  onChange,
  placeholder,
  className,
  allowDecimal = true,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  allowDecimal?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value == null ? '' : fmtKg(value));
  useEffect(() => {
    // Synchronizacja, gdy wartość zmieni się z zewnątrz (np. przycisk +/−).
    if (parseNum(text) !== value) setText(value == null ? '' : fmtKg(value));
  }, [value]);
  return (
    <input
      aria-label={ariaLabel}
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9,.\-]/g, '');
        setText(t);
        onChange(parseNum(t));
      }}
      onBlur={() => setText(value == null ? '' : fmtKg(value))}
      className={cx(
        'w-full min-w-0 rounded-lg bg-transparent text-center text-lg font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-zinc-400 focus:bg-zinc-100 dark:placeholder:text-zinc-600 dark:focus:bg-zinc-800',
        className,
      )}
    />
  );
}

/** −  [wartość]  + */
export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  placeholder,
  suffix,
  allowDecimal,
  ariaLabel,
  compact,
  startAt,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  /** Wartość ustawiana przez pierwsze „+”, gdy pole jest puste. */
  startAt?: number;
  placeholder?: string;
  suffix?: string;
  allowDecimal?: boolean;
  ariaLabel?: string;
  compact?: boolean;
}) {
  const bump = (d: number) => {
    let next = value == null ? (startAt ?? Math.max(0, d)) : Math.round((value + d) * 100) / 100;
    if (min != null && next < min) next = min;
    onChange(next);
  };
  const btn = cx(
    'flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl font-medium active:bg-zinc-300 dark:bg-zinc-800 dark:active:bg-zinc-700',
    compact ? 'h-12 w-9' : 'h-12 w-12',
  );
  return (
    <div className="flex min-w-0 items-center gap-1">
      <button type="button" className={btn} aria-label="Mniej" onClick={() => bump(-step)}>
        −
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <NumInput value={value} onChange={onChange} placeholder={placeholder} allowDecimal={allowDecimal} ariaLabel={ariaLabel} className="h-8" />
        {suffix && <span className="-mt-0.5 text-[11px] leading-none text-zinc-500">{suffix}</span>}
      </div>
      <button type="button" className={btn} aria-label="Więcej" onClick={() => bump(step)}>
        +
      </button>
    </div>
  );
}

/* ---------- Przełączniki ---------- */

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex min-h-12 w-full items-center gap-3 text-left">
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-zinc-500">{hint}</span>}
      </span>
      <span className={cx('relative h-8 w-14 shrink-0 rounded-full transition-colors', checked ? 'bg-accent-500' : 'bg-zinc-300 dark:bg-zinc-700')}>
        <span className={cx('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-7' : 'left-1')} />
      </span>
    </button>
  );
}

export function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 flex-1 rounded-lg px-1 text-sm font-semibold',
            o.value === value ? 'bg-white shadow-sm dark:bg-zinc-600' : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full min-h-12 rounded-xl border border-zinc-300 bg-white px-3 outline-none focus:border-accent-500 dark:border-zinc-700 dark:bg-zinc-900';

/* ---------- Arkusz (modal od dołu) ---------- */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="pb-safe relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Zamknij" className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl active:bg-zinc-200 dark:active:bg-zinc-800">
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-zinc-500">{children}</p>;
}
