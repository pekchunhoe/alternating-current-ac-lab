import { memo, useId, useState } from 'react';
import type { ReactNode } from 'react';
import katex from 'katex';
import { Info, RotateCcw } from 'lucide-react';
import { format } from '../physics/ac';
export const Equation = memo(function Equation({
  tex,
  block = false,
}: {
  tex: string;
  block?: boolean;
}) {
  const html = katex.renderToString(tex, {
    displayMode: block,
    throwOnError: true,
    strict: 'error',
    output: 'htmlAndMathml',
    trust: false,
  });
  return (
    <span
      className={`equation ${block ? 'equation-block' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h3>{title}</h3>
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
export function Parameter({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  log = false,
  digits = 1,
}: {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  log?: boolean;
  digits?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState<{ text: string; source: number } | null>(null);
  const [error, setError] = useState('');
  const editing = draft?.source === value;
  const commit = (raw: string) => {
    // A rounded display value is not a user edit; preserve exact resonance and other SI values.
    if (!editing) return;
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n) || n < min || n > max) {
      setError(`Enter ${min}–${format(max, 1)} ${unit}.`);
      return;
    }
    setDraft(null);
    setError('');
    if (n !== value) onChange(n);
  };
  const sliderValue = log ? (Math.log(value / min) / Math.log(max / min)) * 1000 : value;
  return (
    <div className="parameter">
      <div className="parameter-label">
        <label htmlFor={`${id}-number`}>
          {label} <span>{symbol}</span>
        </label>
        <div className="number-unit">
          <input
            id={`${id}-number`}
            aria-label={label}
            type="number"
            min={min}
            max={max}
            step="any"
            value={editing ? draft.text : Number(value.toFixed(digits + 3))}
            onChange={(e) => {
              const n = Number(e.target.value);
              const valid = e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max;
              setDraft({ text: e.target.value, source: valid ? n : value });
              if (valid) {
                onChange(n);
                setError('');
              }
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(e.currentTarget.value);
            }}
            aria-invalid={editing && !!error}
            aria-describedby={editing && error ? `${id}-error` : undefined}
          />
          <span>{unit}</span>
        </div>
      </div>
      <input
        className="range"
        type="range"
        aria-label={`${label} slider`}
        aria-valuetext={`${format(value, digits)} ${unit}`}
        min={log ? 0 : min}
        max={log ? 1000 : max}
        step={log ? 1 : step}
        value={sliderValue}
        style={
          {
            '--range-progress': `${log ? sliderValue / 10 : ((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
        onChange={(e) => {
          setDraft(null);
          setError('');
          onChange(
            log ? min * (max / min) ** (Number(e.target.value) / 1000) : Number(e.target.value),
          );
        }}
      />
      <div className="range-labels">
        <span>
          {min} {unit}
        </span>
        <span>
          {format(max, 0)} {unit}
        </span>
      </div>
      {editing && error && (
        <p role="alert" id={`${id}-error`} className="input-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Metric({
  label,
  value,
  unit,
  color,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className={`metric ${color ?? ''}`}>
      <span className="metric-label">{label}</span>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Info size={16} />
      <p>{children}</p>
    </div>
  );
}
export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="text-button" onClick={onClick}>
      <RotateCcw size={13} />
      Reset experiment
    </button>
  );
}
