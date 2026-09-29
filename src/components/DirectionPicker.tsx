import { useTranslation } from 'react-i18next';

// Same 16-point labels as the rest of the app (O = oeste)
const SECTORS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

const SIZE = 216;
const RADIUS = 88;
const BTN = 34;

interface Props {
  /** Sector indices 0-15 (0 = N, clockwise). Empty = any direction */
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}

export function DirectionPicker({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const selected = new Set(value);

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }} role="group" aria-label={t('settings.alertDirs')}>
        <div className="absolute inset-[26px] rounded-full border border-border" />
        <div className="absolute inset-0 flex items-center justify-center px-12 text-center text-[0.65rem] leading-tight text-muted-foreground">
          {value.length === 0 ? t('settings.alertDirsAny') : t('settings.alertDirsCount', { count: value.length })}
        </div>
        {SECTORS.map((label, i) => {
          const a = (i * 22.5 - 90) * Math.PI / 180;
          const x = SIZE / 2 + RADIUS * Math.cos(a) - BTN / 2;
          const y = SIZE / 2 + RADIUS * Math.sin(a) - BTN / 2;
          const on = selected.has(i);
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              aria-pressed={on}
              aria-label={label}
              style={{ left: x, top: y, width: BTN, height: BTN }}
              className={`absolute flex items-center justify-center rounded-full border font-mono text-[0.6rem] font-bold transition-colors disabled:opacity-50 ${
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([])}
          className="rounded-md px-2 py-1 text-[0.7rem] text-primary underline disabled:opacity-50"
        >
          {t('settings.alertDirsClear')}
        </button>
      )}
    </div>
  );
}
