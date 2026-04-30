import { motion } from 'framer-motion';
import { windInfo, windColor, bft } from '@/lib/weather-helpers';

interface Props {
  degrees: number;
  speed: number;
  gustSpeed: number;
}

const CARDINALS = [
  { label: 'N', angle: 0 },
  { label: 'NE', angle: 45 },
  { label: 'E', angle: 90 },
  { label: 'SE', angle: 135 },
  { label: 'S', angle: 180 },
  { label: 'SO', angle: 225 },
  { label: 'O', angle: 270 },
  { label: 'NO', angle: 315 },
];

export function WindRose({ degrees, speed, gustSpeed }: Props) {
  const info = windInfo(degrees);
  const b = bft(speed);
  const color = windColor(speed);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 88;
  const innerR = 36;
  const tickR = 78;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
      <div className="mb-2 text-[0.6rem] uppercase tracking-widest text-muted-foreground">🧭 Dirección</div>
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
          {/* Outer circle */}
          <circle cx={cx} cy={cy} r={outerR} fill="none" className="stroke-border" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={outerR - 15} fill="none" className="stroke-border/30" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={innerR} fill="none" className="stroke-border/50" strokeWidth="1" />

          {/* Degree ticks (every 15°) */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 - 90) * Math.PI / 180;
            const major = i % 3 === 0;
            const r1 = major ? outerR - 8 : outerR - 5;
            return (
              <line
                key={i}
                x1={cx + r1 * Math.cos(a)}
                y1={cy + r1 * Math.sin(a)}
                x2={cx + outerR * Math.cos(a)}
                y2={cy + outerR * Math.sin(a)}
                className="stroke-muted-foreground"
                strokeWidth={major ? 1.5 : 0.7}
                strokeOpacity={major ? 0.8 : 0.4}
              />
            );
          })}

          {/* Cardinal labels */}
          {CARDINALS.map(c => {
            const a = (c.angle - 90) * Math.PI / 180;
            const r = outerR - 20;
            const isActive = info.short === c.label || info.short.includes(c.label);
            return (
              <text
                key={c.label}
                x={cx + r * Math.cos(a)}
                y={cy + r * Math.sin(a)}
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-display text-[0.55rem] font-bold ${isActive ? '' : ''}`}
                fill={isActive ? color : 'hsl(var(--muted-foreground))'}
                style={{ fontSize: c.label === 'N' ? '0.7rem' : '0.55rem' }}
              >
                {c.label}
              </text>
            );
          })}

          {/* Wind arrow — translated to center so rotation is always around (0,0) */}
          <g transform={`translate(${cx}, ${cy})`}>
            <motion.g
              initial={{ rotate: 0 }}
              animate={{ rotate: degrees }}
              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
              style={{ transformOrigin: '0px 0px' }}
            >
              <line
                x1={0} y1={innerR - 5}
                x2={0} y2={-tickR + 12}
                stroke={color} strokeWidth="2.5" strokeLinecap="round"
              />
              <polygon
                points={`0,${-tickR + 5} -7,${-tickR + 18} 7,${-tickR + 18}`}
                fill={color}
              />
              <line
                x1={-5} y1={innerR - 2}
                x2={5} y2={innerR - 2}
                stroke={color} strokeWidth="2" strokeLinecap="round"
              />
            </motion.g>
          </g>

          {/* Center circle */}
          <circle cx={cx} cy={cy} r={innerR - 4} className="fill-card" />
          <circle cx={cx} cy={cy} r={innerR - 4} fill={color} fillOpacity="0.1" />
          <circle cx={cx} cy={cy} r={innerR - 4} stroke={color} strokeWidth="1.5" fill="none" strokeOpacity="0.5" />
          
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" fill={color} className="font-display text-sm font-bold">
            {info.short}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[0.45rem]">
            {Math.round(degrees)}°
          </text>
        </svg>

        {/* Info below the rose */}
        <div className="flex w-full flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-bold font-display" style={{ color }}>{info.full}</span>
          <span className="text-[0.65rem] text-muted-foreground">
            BFT {b[0]} · {b[1]}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
