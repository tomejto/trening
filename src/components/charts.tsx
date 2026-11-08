import { useEffect, useRef, useState, type ReactNode } from 'react';
import { parseISODate } from '../lib/dates';
import { fmtDateShort, fmtKg } from '../lib/format';

/* Lekkie wykresy SVG bez bibliotek: cienkie linie 2 px, znaczniki 8 px z obwódką w kolorze tła,
   stonowana siatka, legenda dla ≥ 2 serii, dotknięcie/najechanie pokazuje wartości. */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** „Ładne” podziałki osi Y. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export interface LineSeries {
  key: string;
  label: string;
  color: string; // np. 'var(--series-1)'
  points: { date: string; value: number | null }[];
}

export function LineChart({ series, unit = 'kg', height = 210 }: { series: LineSeries[]; unit?: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const values = series.flatMap((s) => s.points.map((p) => p.value)).filter((v): v is number => v != null);
  if (dates.length === 0 || values.length === 0) return <p className="py-6 text-center text-sm text-zinc-500">Brak danych do wykresu.</p>;

  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const pad = { top: 12, right: 14, bottom: 26, left: 38 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const t0 = parseISODate(dates[0]).getTime();
  const t1 = parseISODate(dates[dates.length - 1]).getTime();
  const x = (d: string) => pad.left + (t1 === t0 ? w / 2 : ((parseISODate(d).getTime() - t0) / (t1 - t0)) * w);
  const y = (v: number) => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;

  const nearest = (px: number) => {
    let best = 0;
    let dist = Infinity;
    dates.forEach((d, i) => {
      const dd = Math.abs(x(d) - px);
      if (dd < dist) {
        dist = dd;
        best = i;
      }
    });
    return best;
  };

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActive(nearest(e.clientX - rect.left));
  };

  const activeDate = active != null ? dates[active] : null;
  const xLabels = dates.length === 1 ? [dates[0]] : [dates[0], dates[dates.length - 1]];

  return (
    <div>
      {series.length > 1 && <Legend series={series} />}
      <div ref={ref} className="relative select-none" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className="touch-pan-y"
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
            role="img"
            aria-label={series.map((s) => s.label).join(', ')}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
                <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--chart-text)">
                  {fmtKg(t)}
                </text>
              </g>
            ))}
            {xLabels.map((d, i) => (
              <text key={d} x={x(d)} y={height - 6} fontSize={11} fill="var(--chart-text)" textAnchor={xLabels.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}>
                {fmtDateShort(d)}
              </text>
            ))}
            {activeDate && <line x1={x(activeDate)} x2={x(activeDate)} y1={pad.top} y2={pad.top + h} stroke="var(--chart-text)" strokeWidth={1} strokeDasharray="3 3" />}
            {series.map((s) => {
              const pts = s.points.filter((p) => p.value != null) as { date: string; value: number }[];
              const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ');
              return (
                <g key={s.key}>
                  <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {/* przy gęstych danych same linie; znacznik tylko przy wskazanym punkcie */}
                  {pts.filter((p) => pts.length <= 16 || p.date === activeDate).map((p) => (
                    <circle
                      key={p.date}
                      cx={x(p.date)}
                      cy={y(p.value)}
                      r={p.date === activeDate ? 5.5 : 4}
                      fill={s.color}
                      stroke="var(--chart-surface)"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        )}
        {activeDate && width > 0 && (
          <Tooltip x={x(activeDate)} width={width}>
            <div className="font-semibold">{fmtDateShort(activeDate)}</div>
            {series.map((s) => {
              const v = s.points.find((p) => p.date === activeDate)?.value;
              return (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-zinc-500">{s.label}:</span>
                  <span className="font-semibold tabular-nums">{v != null ? `${fmtKg(v)} ${unit}` : '—'}</span>
                </div>
              );
            })}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function Legend({ series }: { series: LineSeries[] }) {
  return (
    <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
          <span className="inline-block h-2 w-2 -ml-3 mr-1 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 80, 0), width - 170);
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 w-[170px] rounded-lg border border-zinc-200 bg-white/95 px-2 py-1.5 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900/95"
      style={{ left }}
    >
      {children}
    </div>
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  detail?: ReactNode;
}

/** Słupki jednej serii; etykieta wartości tylko przy ostatnim (bieżącym) słupku i po dotknięciu. */
export function BarChart({ data, height = 160, color = 'var(--series-1)' }: { data: BarDatum[]; height?: number; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(0, max, 3);
  const yMax = ticks[ticks.length - 1];
  const pad = { top: 16, right: 4, bottom: 22, left: 28 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const slot = data.length ? w / data.length : 0;
  const barW = Math.max(4, slot - 6);
  const y = (v: number) => pad.top + h - (v / yMax) * h;
  const r = Math.min(4, barW / 2);

  return (
    <div ref={ref} className="relative select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Wykres słupkowy">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--chart-text)">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const bx = pad.left + i * slot + (slot - barW) / 2;
            const by = y(d.value);
            const bh = pad.top + h - by;
            const isLast = i === data.length - 1;
            return (
              <g key={d.key} onPointerDown={() => setActive(i)} onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
                {/* większy obszar dotyku niż sam słupek */}
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={h} fill="transparent" />
                {d.value > 0 && (
                  <path
                    d={`M${bx},${by + bh} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + barW - r} Q${bx + barW},${by} ${bx + barW},${by + r} V${by + bh} Z`}
                    fill={color}
                    opacity={active == null || active === i ? 1 : 0.55}
                  />
                )}
                {(isLast || active === i) && d.value > 0 && (
                  <text x={bx + barW / 2} y={by - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="currentColor">
                    {d.value}
                  </text>
                )}
                {(i % 2 === (data.length - 1) % 2 || data.length <= 6) && (
                  <text x={bx + barW / 2} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--chart-text)">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {active != null && data[active]?.detail && width > 0 && (
        <Tooltip x={pad.left + active * slot + slot / 2} width={width}>
          {data[active].detail}
        </Tooltip>
      )}
    </div>
  );
}

/** Serie wykresu ćwiczenia: najlepszy ciężar i – jeśli są powtórzenia – szacowany 1RM. */
export function exerciseChartSeries(points: { date: string; bestWeight: number; bestE1RM: number | null }[]): LineSeries[] {
  const series: LineSeries[] = [
    { key: 'w', label: 'Najlepszy ciężar', color: 'var(--series-1)', points: points.map((p) => ({ date: p.date, value: p.bestWeight })) },
  ];
  if (points.some((p) => p.bestE1RM != null))
    series.push({ key: 'e', label: 'Szacowany 1RM', color: 'var(--series-2)', points: points.map((p) => ({ date: p.date, value: p.bestE1RM })) });
  return series;
}
