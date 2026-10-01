import { useState } from 'react';
import { formatGameDate } from '../lib/format';
import { formatSvPct } from '../stats/gameStats';
import type { TrendPoint } from '../stats/seasonStats';

const W = 620;
const H = 240;
const LEFT = 44;
const RIGHT = 610;
const TOP = 20;
const BOTTOM = 200;

/** SV% (solid) and HDSV% (dotted) game over game, with a tooltip on hover or tap. */
export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const values = points.flatMap((p) => [p.svPct, p.hdSvPct]).filter((v): v is number => v !== null);
  // Default floor .700, lowered in .100 steps if a game dipped below it.
  const yMin = Math.min(0.7, Math.floor(Math.min(...values, 1) * 10) / 10);
  const ticks: number[] = [];
  for (let v = 1; v >= yMin - 1e-9; v -= 0.1) ticks.push(v);

  const x = (i: number) => (points.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + 16 + (i * (RIGHT - LEFT - 16)) / (points.length - 1));
  const y = (v: number) => BOTTOM - ((v - yMin) / (1 - yMin)) * (BOTTOM - TOP);

  /** A path through non-null values; a missing value breaks the line. */
  function path(get: (p: TrendPoint) => number | null): string {
    let d = '';
    let pen = false;
    points.forEach((p, i) => {
      const v = get(p);
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  }

  const svPath = path((p) => p.svPct);
  const last = points.length - 1;
  const lastSv = points[last]?.svPct;
  const slot = points.length > 1 ? (RIGHT - LEFT - 16) / (points.length - 1) : RIGHT - LEFT;
  const activePoint = active === null ? null : points[active];

  return (
    <div className="relative" onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Save percentage and high-danger save percentage by game">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} stroke={t === ticks[ticks.length - 1] ? '#243041' : '#1a232e'} />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fill="#8c9aab" fontSize={12}>
              {formatSvPct(t)}
            </text>
          </g>
        ))}

        {activePoint && <line x1={x(active!)} x2={x(active!)} y1={TOP} y2={BOTTOM} stroke="#5f6d7e" strokeDasharray="3 3" />}

        <path d={path((p) => p.hdSvPct)} fill="none" stroke="#eef3f8" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
        <path d={svPath} fill="none" stroke="#5cb8ff" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) =>
          p.svPct === null ? null : (
            <circle
              key={p.gameId}
              cx={x(i)}
              cy={y(p.svPct)}
              r={i === active || i === last ? 5 : 3.5}
              fill="#0a0e13"
              stroke="#5cb8ff"
              strokeWidth={i === active || i === last ? 3 : 2}
            />
          ),
        )}
        {lastSv !== null && lastSv !== undefined && active === null && (
          <text x={x(last)} y={y(lastSv) - 12} textAnchor="end" fill="#eef3f8" fontSize={13} fontWeight={700}>
            {formatSvPct(lastSv)}
          </text>
        )}

        <text x={x(0)} y={226} fill="#8c9aab" fontSize={12} textAnchor={points.length > 1 ? 'start' : 'middle'}>
          {formatGameDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={x(last)} y={226} textAnchor="end" fill="#8c9aab" fontSize={12}>
            {formatGameDate(points[last].date)}
          </text>
        )}

        {/* Hit areas, one per game, wider than the marks */}
        {points.map((p, i) => (
          <rect
            key={p.gameId}
            x={x(i) - slot / 2}
            y={TOP}
            width={slot}
            height={BOTTOM - TOP + 20}
            fill="transparent"
            onPointerEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          />
        ))}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max rounded-xl border border-line-strong bg-well px-3 py-2 text-[13px] shadow-xl"
          style={{
            left: `${(x(active!) / W) * 100}%`,
            transform: `translateX(${active! > points.length / 2 ? 'calc(-100% - 12px)' : '12px'})`,
          }}
        >
          <div className="font-bold">
            {formatGameDate(activePoint.date)} · {activePoint.opponent}
          </div>
          <div className="mt-1 flex items-center gap-2 text-fg-2">
            <span className="h-[3px] w-3.5 rounded bg-save" />
            SV% <span className="ml-auto pl-3 font-bold text-fg">{formatSvPct(activePoint.svPct)}</span>
          </div>
          <div className="flex items-center gap-2 text-fg-2">
            <span className="w-3.5 border-t-[3px] border-dotted border-fg" />
            HDSV% <span className="ml-auto pl-3 font-bold text-fg">{formatSvPct(activePoint.hdSvPct)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
