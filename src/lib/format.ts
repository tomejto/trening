const kgFmt = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });

export function fmtKg(n: number | null | undefined): string {
  if (n == null) return '—';
  return kgFmt.format(n);
}

/** Parsuje liczbę wpisaną z przecinkiem lub kropką. Zwraca null dla pustego/nieprawidłowego tekstu. */
export function parseNum(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Zaokrąglenie do 0,01 – unika błędów typu 60 + 2.5 = 62.49999. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const WEEKDAYS_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
export const WEEKDAYS_LONG = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
/** Kolejność wyświetlania dni: od poniedziałku. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function repRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const s = date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Polska odmiana: plural(2, 'tydzień', 'tygodnie', 'tygodni') → 'tygodnie'. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n);
  if (a === 1) return one;
  const d = a % 10;
  const t = a % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

/**
 * Serie w jednej linii. Szybki zapis (bez powtórzeń): „72,5 kg”, a przy różnych ciężarach „2 × 70 kg · 1 × 72,5 kg”;
 * pełny zapis: „72,5×8 · 72,5×7”.
 */
export function fmtSets(sets: { weight: number | null; reps: number | null }[]): string {
  if (sets.length === 0) return '';
  if (sets.every((s) => s.reps == null)) {
    const groups: { weight: number | null; n: number }[] = [];
    for (const s of sets) {
      const last = groups[groups.length - 1];
      if (last && last.weight === s.weight) last.n++;
      else groups.push({ weight: s.weight, n: 1 });
    }
    const label = (w: number | null) => (w ? `${fmtKg(w)} kg` : 'bez obciążenia');
    if (groups.length === 1) return label(groups[0].weight);
    return groups.map((g) => `${g.n} × ${label(g.weight)}`).join(' · ');
  }
  return sets.map((s) => `${fmtKg(s.weight)}×${s.reps ?? '?'}`).join(' · ');
}
