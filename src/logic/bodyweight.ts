import type { BodyWeight } from '../db/types';
import { parseISODate } from '../lib/dates';

const DAY = 86_400_000;
const dayNum = (iso: string) => Math.round(parseISODate(iso).getTime() / DAY);

export function sortByDate(entries: BodyWeight[]): BodyWeight[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

/** Średnia krocząca: dla każdego pomiaru średnia z pomiarów z ostatnich `days` dni (włącznie). */
export function movingAverage(entries: BodyWeight[], days = 7): { date: string; value: number }[] {
  const sorted = sortByDate(entries);
  return sorted.map((e) => {
    const d = dayNum(e.date);
    const win = sorted.filter((x) => dayNum(x.date) <= d && dayNum(x.date) > d - days);
    const avg = win.reduce((s, x) => s + x.kg, 0) / win.length;
    return { date: e.date, value: Math.round(avg * 100) / 100 };
  });
}

/**
 * Tempo zmian masy (kg/tydzień) – nachylenie regresji liniowej z pomiarów z ostatnich `days` dni.
 * null, gdy jest mniej niż 3 pomiary albo obejmują mniej niż 7 dni.
 */
export function weeklyRate(entries: BodyWeight[], today: string, days = 28): number | null {
  const t = dayNum(today);
  const pts = entries.filter((e) => dayNum(e.date) <= t && dayNum(e.date) > t - days).map((e) => ({ x: dayNum(e.date), y: e.kg }));
  if (pts.length < 3) return null;
  const xs = pts.map((p) => p.x);
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const num = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return Math.round((num / den) * 7 * 100) / 100;
}
