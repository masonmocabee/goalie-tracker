import type { NetZone } from '../types';

interface Props {
  /** Picker mode: the selected zone. */
  value?: NetZone;
  /** Picker mode. Tapping the selected zone clears it. */
  onChange?: (zone: NetZone | undefined) => void;
  /** Heat-map mode: goal counts per zone, shaded light to dark. */
  counts?: Partial<Record<NetZone, number>>;
  /** Game mode: goal numbers per zone (goal #1, #3...). */
  markers?: Partial<Record<NetZone, number[]>>;
}

interface Spot {
  cx: number;
  cy: number;
  r: number;
  lines: string[]; // short label shown inside the circle
}

// Shooter's view of a left-catching goalie: glove (goalie's left) is on the shooter's right,
// blocker (goalie's right) on the shooter's left. Three heights per side: high, low (above
// the pad, below the glove/blocker), and pad low (beat at the legs).
const SPOTS: Record<Exclude<NetZone, 'unknown'>, Spot> = {
  blocker_high: { cx: 62, cy: 56, r: 24, lines: ['Blocker', 'high'] },
  glove_high: { cx: 258, cy: 56, r: 24, lines: ['Glove', 'high'] },
  blocker_low: { cx: 56, cy: 150, r: 24, lines: ['Blocker', 'low'] },
  glove_low: { cx: 266, cy: 158, r: 24, lines: ['Glove', 'low'] },
  right_pad_low: { cx: 62, cy: 214, r: 24, lines: ['R pad', 'low'] },
  left_pad_low: { cx: 258, cy: 214, r: 24, lines: ['L pad', 'low'] },
  five_hole: { cx: 160, cy: 206, r: 22, lines: ['5-hole'] },
};

const HIT_RADIUS = 30; // bigger than the drawn circle so it's easy to tap
const ORANGE = '#ff8a4c';

export default function NetDiagram({ value, onChange, counts, markers }: Props) {
  const toggle = (zone: NetZone) => onChange?.(value === zone ? undefined : zone);
  const maxCount = Math.max(1, ...Object.keys(SPOTS).map((z) => counts?.[z as NetZone] ?? 0));
  const unknownMarkers = markers?.unknown ?? [];

  return (
    <div>
      <svg viewBox="0 0 320 250" className="w-full select-none" role="group" aria-label="Net zones, shooter's view">
        <defs>
          <pattern id="net-mesh" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0 V12 M0 0 H12" stroke="rgba(238,243,248,0.07)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={16} y={14} width={288} height={230} fill="#0d1218" />
        <rect x={16} y={14} width={288} height={230} fill="url(#net-mesh)" />

        <Goalie />

        {/* Posts, crossbar and goal line */}
        <path d="M16 244 V14 H304 V244" fill="none" stroke="#e5ecf3" strokeWidth={6} strokeLinejoin="round" />
        <path d="M10 245 H310" stroke="#e5484d" strokeWidth={3} strokeLinecap="round" />

        {(Object.entries(SPOTS) as [NetZone, Spot][]).map(([zone, s]) => {
          const selected = value === zone;
          const count = counts?.[zone] ?? 0;
          const numbers = markers?.[zone] ?? [];
          const heat = count ? 0.2 + 0.8 * (count / maxCount) : 0;
          const filled = selected || numbers.length > 0;
          const darkText = filled || heat > 0.6;
          const faint = markers && numbers.length === 0;

          const label = numbers.length ? [numbers.join(',')] : s.lines;
          const lineHeight = 10;
          const firstLineY = s.cy - ((label.length - 1) * lineHeight) / 2;
          const textClass = numbers.length
            ? 'text-[15px] font-extrabold'
            : 'text-[9.5px] font-semibold';
          const textColor = darkText ? '#1a0c04' : heat ? '#ffe2d2' : faint ? '#5f6d7e' : '#c9d3de';

          return (
            <g
              key={zone}
              onClick={() => toggle(zone)}
              className={onChange ? 'cursor-pointer' : undefined}
              role={onChange ? 'button' : 'img'}
              aria-pressed={onChange ? selected : undefined}
              aria-label={
                s.lines.join(' ') +
                (counts ? `: ${count} goals` : '') +
                (numbers.length ? `: goal ${numbers.join(', ')}` : '')
              }
            >
              <circle cx={s.cx} cy={s.cy} r={HIT_RADIUS} fill="transparent" />
              <circle
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={filled ? ORANGE : 'rgba(10,14,19,0.82)'}
                stroke={filled ? ORANGE : 'rgba(201,211,222,0.35)'}
                strokeWidth={1.5}
                strokeDasharray={filled ? undefined : '3 3'}
              />
              {heat > 0 && <circle cx={s.cx} cy={s.cy} r={s.r} fill={ORANGE} fillOpacity={heat} />}
              {label.map((line, i) => (
                <text
                  key={line}
                  x={s.cx}
                  y={firstLineY + i * lineHeight}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  className={`pointer-events-none ${textClass}`}
                >
                  {line}
                </text>
              ))}
              {counts && count > 0 && (
                <g className="pointer-events-none">
                  <circle cx={s.cx + s.r * 0.75} cy={s.cy - s.r * 0.75} r={11} fill="#eef3f8" stroke="#0a0e13" strokeWidth={2} />
                  <text
                    x={s.cx + s.r * 0.75}
                    y={s.cy - s.r * 0.75}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0a0e13"
                    className="text-[12px] font-extrabold"
                  >
                    {count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex min-h-8 items-center justify-between gap-2 text-xs text-muted">
        <span>Shooter's view · glove right</span>
        {onChange && (
          <button
            type="button"
            onClick={() => toggle('unknown')}
            aria-pressed={value === 'unknown'}
            className={`h-8 rounded-full border px-3 font-bold ${
              value === 'unknown' ? 'border-goal bg-goal text-goal-ink' : 'border-line-strong text-fg-2'
            }`}
          >
            Unknown
          </button>
        )}
        {!!counts?.unknown && <span>{counts.unknown} unknown</span>}
        {unknownMarkers.length > 0 && (
          <span className="rounded-full border border-dashed border-goal/60 px-2.5 py-0.5 font-bold text-goal-soft">
            {unknownMarkers.join(', ')} · ?
          </span>
        )}
      </div>
    </div>
  );
}

/** Goalie silhouette in a ready stance, drawn behind the zone circles. */
function Goalie() {
  const gear = '#243041';
  const body = '#1c2632';
  return (
    <g aria-hidden className="pointer-events-none">
      {/* Stick: shaft from the blocker down to a blade in front of the five hole */}
      <path d="M96 146 L130 236 H178" fill="none" stroke="#3a4757" strokeWidth={5} strokeLinecap="round" />
      {/* Arms */}
      <path d="M134 92 L104 122" stroke={body} strokeWidth={15} strokeLinecap="round" />
      <path d="M186 92 L214 116" stroke={body} strokeWidth={15} strokeLinecap="round" />
      {/* Torso and mask */}
      <rect x={126} y={74} width={68} height={72} rx={16} fill={body} />
      <circle cx={160} cy={58} r={17} fill={gear} />
      <rect x={152} y={52} width={16} height={12} rx={3} fill="#0d1218" opacity={0.6} />
      {/* Pads */}
      <rect x={104} y={138} width={38} height={104} rx={10} fill={gear} />
      <rect x={178} y={138} width={38} height={104} rx={10} fill={gear} />
      {/* Blocker (shooter's left) and glove (shooter's right) */}
      <rect x={84} y={106} width={24} height={42} rx={5} fill={gear} />
      <ellipse cx={226} cy={122} rx={22} ry={19} fill={gear} />
    </g>
  );
}
