import { useRef } from 'react';

interface Props {
  direction: number;
  seaBearing?: number;
  topLabel?: string;
  bottomLabel?: string;
}

// Ordered N, NE, E, SE, S, SW, W, NW — each covers a 45° sector centred on its bearing.
const LOCAL_WIND_NAMES = [
  'TRAMUNTANA',
  'GREGAL',
  'LLEVANT',
  'XALOC',
  'MIGJORN',
  'GARBÍ',
  'PONENT',
  'MESTRAL',
];

const POINTS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const POINTS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const ORANGE = '#f26b2a';
const BG = '#0b1a33';
const W = 260;
const H = 316;
const CX = W / 2;
const CY = 164;
const R = 104;

const TICK_BEARINGS = Array.from(new Set([
  ...Array.from({ length: 36 }, (_, i) => i * 10),
  ...Array.from({ length: 8 }, (_, i) => i * 45),
])).sort((a, b) => a - b);

const mod360 = (v: number) => ((v % 360) + 360) % 360;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

const ROSE_POINTS = Array.from({ length: 16 }, (_, i) => {
  const r = i % 2 === 1 ? 9 : i % 4 === 0 ? 54 : 34;
  const { x, y } = polar(i * 22.5, r);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}).join(' ');

export function WindVane({ direction, seaBearing = 160, topLabel = 'MAR', bottomLabel = '' }: Props) {
  const dir = mod360(direction);
  const target = direction - seaBearing;

  // Unbounded angle so the CSS transition always takes the shortest path (350° -> 10° turns 20°, not 340°).
  const angleRef = useRef<number | null>(null);
  if (angleRef.current === null) {
    angleRef.current = target;
  } else {
    const prev = angleRef.current;
    angleRef.current = prev + mod360(target - prev + 540) - 180;
  }

  const point = POINTS_16[Math.round(dir / 22.5) % 16];
  const degrees = Math.round(dir) % 360;
  const localName = LOCAL_WIND_NAMES[Math.round(dir / 45) % 8];

  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#0b1a33] p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full max-w-[260px]"
        role="img"
        aria-label={`${point} ${degrees}° · ${localName}`}
      >
        <text x={CX} y={36} textAnchor="middle" className="font-display">
          <tspan fill="#ffffff" fontSize="28" fontWeight="700">{point}</tspan>
          <tspan fill="#8a9bb4" fontSize="16" dx="8">{degrees}°</tspan>
        </text>

        <circle cx={CX} cy={CY} r={R} fill="#112748" />
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${CX + R} ${CY} Z`} fill="#081629" fillOpacity="0.6" />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4a5f7f" strokeWidth="1" />

        {TICK_BEARINGS.map(b => {
          const long = b % 45 === 0;
          const a = b - seaBearing;
          const p1 = polar(a, R - 4 - (long ? 11 : 5));
          const p2 = polar(a, R - 4);
          return (
            <line
              key={b}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#6b81a3"
              strokeWidth={long ? 1.4 : 0.8}
              strokeOpacity={long ? 0.95 : 0.6}
            />
          );
        })}

        {POINTS_8.map((label, i) => {
          const { x, y } = polar(i * 45 - seaBearing, R - 27);
          return (
            <text
              key={label}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#b9c6d8"
              fontSize="10"
              fontWeight="600"
            >
              {label}
            </text>
          );
        })}

        <g transform={`rotate(${-seaBearing} ${CX} ${CY})`} stroke="#9fb1cc" strokeOpacity="0.22" strokeWidth="0.8" fill="none">
          <polygon points={ROSE_POINTS} />
          {Array.from({ length: 8 }, (_, i) => {
            const { x, y } = polar(i * 45, i % 2 === 0 ? 54 : 34);
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />;
          })}
        </g>

        <line
          x1={CX - R} y1={CY} x2={CX + R} y2={CY}
          stroke="#7a8fae" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="4 4"
        />

        {topLabel && (
          <text x={CX} y={CY - 38} textAnchor="middle" fill="#6f84a3" fontSize="9" letterSpacing="3">
            {topLabel}
          </text>
        )}
        {bottomLabel && (
          <text x={CX} y={CY + 46} textAnchor="middle" fill="#6f84a3" fontSize="9" letterSpacing="3">
            {bottomLabel}
          </text>
        )}

        <g transform={`translate(${CX}, ${CY})`}>
          <g
            style={{
              transform: `rotate(${angleRef.current}deg)`,
              transformOrigin: '0px 0px',
              transition: 'transform 0.6s ease',
            }}
          >
            <line x1={0} y1={-54} x2={0} y2={58} stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
            <polygon points="0,-72 -9,-50 0,-55 9,-50" fill={ORANGE} />
            <circle cx={0} cy={64} r={5} fill={BG} stroke={ORANGE} strokeWidth="2" />
          </g>
        </g>
        <circle cx={CX} cy={CY} r={4} fill="#ffffff" />

        <text
          x={CX} y={H - 16}
          textAnchor="middle"
          fill={ORANGE}
          fontSize="18"
          fontWeight="800"
          letterSpacing="1.5"
          className="font-display"
        >
          {localName}
        </text>
      </svg>
    </div>
  );
}
