import { useId, type MouseEvent } from 'react';
import type { ShotOrigin } from '../types';

interface Marker {
  origin: ShotOrigin;
  label: string; // goal number
}

interface Props {
  /** Picker mode: the chosen spot. */
  value?: ShotOrigin;
  /** Picker mode: tap the ice to set (or move) the spot. */
  onChange?: (origin: ShotOrigin) => void;
  /** Summary mode: numbered goal markers. */
  markers?: Marker[];
  /** Heat-map mode: soft glows that brighten where goals cluster. */
  heat?: ShotOrigin[];
}

// The drawing is the attacking zone seen from above: end boards and net at the top,
// blue line at the bottom. Origins are stored as fractions of this box so the art can change.
const W = 313;
const H = 250;
// Keep taps inside the boards.
const MIN_X = 8;
const MAX_X = W - 8;
const MIN_Y = 8;
const MAX_Y = H - 4;

// The ice inside the boards, for clipping the heat map.
const ICE = 'M2 249.8V54.9C2 25.7 25.7 2 54.9 2H257.7C287 2 310.6 25.7 310.6 54.9V249.8Z';

const LINE = '#FFCACA';
const BOARDS = '#596793';
const ORANGE = '#ff8f63';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

/** Half-rink diagram for where a goal was shot from. */
export default function RinkDiagram({ value, onChange, markers = [], heat = [] }: Props) {
  const id = 'rink' + useId().replace(/[^a-zA-Z0-9]/g, ''); // safe inside url(#...)
  // Fade each glow a little as goals pile up, so a big season doesn't turn the whole zone orange.
  const glowOpacity = Math.min(1, 3 / Math.sqrt(Math.max(1, heat.length)));

  function handleTap(e: MouseEvent<SVGSVGElement>) {
    if (!onChange) return;
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    onChange({ x: round(clamp(p.x, MIN_X, MAX_X) / W), y: round(clamp(p.y, MIN_Y, MAX_Y) / H) });
  }

  return (
    <svg
      viewBox={`-2 -2 ${W + 4} ${H + 4}`}
      className={`block h-auto w-full select-none ${onChange ? 'cursor-crosshair touch-manipulation' : ''}`}
      onClick={handleTap}
      role={onChange ? 'button' : 'img'}
      aria-label={onChange ? 'Tap where the goal was shot from' : 'Where goals were shot from'}
    >
      {heat.length > 0 && (
        <>
          <defs>
            <radialGradient id={`${id}-glow`}>
              <stop offset="0%" stopColor="#ffe0c2" stopOpacity={0.7} />
              <stop offset="35%" stopColor={ORANGE} stopOpacity={0.45} />
              <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
            </radialGradient>
            <clipPath id={`${id}-ice`}>
              <path d={ICE} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-ice)`} style={{ mixBlendMode: 'screen' }} className="pointer-events-none">
            {heat.map((o, i) => (
              <circle key={i} cx={o.x * W} cy={o.y * H} r={32} fill={`url(#${id}-glow)`} opacity={glowOpacity} />
            ))}
          </g>
        </>
      )}

      {/* Goal line, blue line and boards */}
      <rect x={5} y={40} width={305} height={4} fill={LINE} />
      <rect x={2} y={217.172} width={308.648} height={7.05481} fill={BOARDS} />
      <path
        d="M2 249.8V54.9111C2 25.6891 25.6891 2 54.9111 2H257.737C286.959 2 310.648 25.6891 310.648 54.9111C310.648 54.9111 310.648 159.571 310.648 249.8"
        stroke={BOARDS}
        strokeWidth={4}
        fill="none"
      />
      {/* Crease */}
      <path d="M178.37 42.5651C178.37 54.2539 168.895 63.7296 157.206 63.7296C145.517 63.7296 136.041 54.2539 136.041 42.5651" stroke={LINE} strokeWidth={4} fill="none" />
      {/* Faceoff circles, slightly dimmed, and dots */}
      {[85.7758, 228.636].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={113.995} r={50.0292} stroke={LINE} strokeWidth={4} fill="none" />
          <circle cx={cx} cy={113.995} r={50.0292} stroke="black" strokeOpacity={0.2} strokeWidth={4} fill="none" />
          <circle cx={cx} cy={113.995} r={7.93666} fill={LINE} />
        </g>
      ))}

      {/* Exact spots on top of the glow */}
      {heat.map((o, i) => (
        <circle key={i} cx={o.x * W} cy={o.y * H} r={2.5} fill="#ffe0c2" className="pointer-events-none" />
      ))}

      {markers.map((m) => (
        <g key={m.label} className="pointer-events-none">
          <circle cx={m.origin.x * W} cy={m.origin.y * H} r={12} fill={ORANGE} />
          <text
            x={m.origin.x * W}
            y={m.origin.y * H}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#1a0c04"
            className="font-display text-[16px] font-bold"
          >
            {m.label}
          </text>
        </g>
      ))}

      {value && (
        <g className="pointer-events-none">
          <circle cx={value.x * W} cy={value.y * H} r={16} fill={ORANGE} fillOpacity={0.25} />
          <circle cx={value.x * W} cy={value.y * H} r={8} fill={ORANGE} stroke="#1a0c04" strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}
