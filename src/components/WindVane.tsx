import { useRef } from 'react';

interface Props {
  direction: number;
  seaBearing?: number;
  topLabel?: string;
  bottomLabel?: string;
  color?: string;
  /** Tailwind size cap for the svg; the default suits the dashboard card */
  className?: string;
  /** The arrow swings this many degrees each way: gusty or unstable wind */
  wobbleDeg?: number;
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

export function WindVane({ direction, seaBearing = 160, topLabel = 'MAR', bottomLabel = '', color = 'hsl(var(--primary))', className = 'max-w-[260px]', wobbleDeg = 0 }: Props) {
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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50">
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`h-auto w-full ${className}`}
        role="img"
        aria-label={`${point} ${degrees}° · ${localName}`}
      >
        <text x={CX} y={36} textAnchor="middle" className="font-display">
          <tspan className="fill-foreground" fontSize="28" fontWeight="700">{point}</tspan>
          <tspan className="fill-muted-foreground" fontSize="16" dx="8">{degrees}°</tspan>
        </text>

        <circle cx={CX} cy={CY} r={R} className="fill-secondary" />
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${CX + R} ${CY} Z`} fill="#000" fillOpacity="0.18" />
        <circle cx={CX} cy={CY} r={R} fill="none" className="stroke-border" strokeWidth="1.5" />

        {TICK_BEARINGS.map(b => {
          const long = b % 45 === 0;
          const a = b - seaBearing;
          const p1 = polar(a, R - 4 - (long ? 11 : 5));
          const p2 = polar(a, R - 4);
          return (
            <line
              key={b}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              className="stroke-muted-foreground"
              strokeWidth={long ? 1.4 : 0.8}
              strokeOpacity={long ? 0.9 : 0.5}
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
              className="fill-foreground"
              fillOpacity="0.75"
              fontSize="10"
              fontWeight="600"
            >
              {label}
            </text>
          );
        })}

        <g
          transform={`rotate(${-seaBearing} ${CX} ${CY})`}
          className="stroke-muted-foreground"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          fill="none"
        >
          <polygon points={ROSE_POINTS} />
          {Array.from({ length: 8 }, (_, i) => {
            const { x, y } = polar(i * 45, i % 2 === 0 ? 54 : 34);
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />;
          })}
        </g>

        <line
          x1={CX - R} y1={CY} x2={CX + R} y2={CY}
          className="stroke-muted-foreground"
          strokeOpacity="0.7" strokeWidth="1" strokeDasharray="4 4"
        />

        {topLabel && (
          <text x={CX} y={CY - 38} textAnchor="middle" className="fill-muted-foreground" fillOpacity="0.8" fontSize="9" letterSpacing="3">
            {topLabel}
          </text>
        )}
        {bottomLabel && (
          <text x={CX} y={CY + 46} textAnchor="middle" className="fill-muted-foreground" fillOpacity="0.8" fontSize="9" letterSpacing="3">
            {bottomLabel}
          </text>
        )}

        <g transform={`translate(${CX}, ${CY})`}>
          <g className={wobbleDeg > 0 ? 'vane-wobble' : undefined} style={{ ['--wobble' as string]: `${wobbleDeg}deg` }}>
          <g
            style={{
              transform: `rotate(${angleRef.current}deg)`,
              transformOrigin: '0px 0px',
              transition: 'transform 0.6s ease',
            }}
          >
            <line x1={0} y1={-54} x2={0} y2={58} stroke={color} strokeWidth="3" strokeLinecap="round" />
            <polygon points="0,-72 -9,-50 0,-55 9,-50" fill={color} />
            <circle cx={0} cy={64} r={5} className="fill-card" stroke={color} strokeWidth="2" />
          </g>
          </g>
        </g>
        <circle cx={CX} cy={CY} r={4} className="fill-foreground" />

        <text
          x={CX} y={H - 16}
          textAnchor="middle"
          fill={color}
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
