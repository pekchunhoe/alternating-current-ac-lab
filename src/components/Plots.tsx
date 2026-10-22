import { memo, useCallback, useId, useMemo, useRef, useState } from 'react';
import { Download, Maximize2, ScanLine, TrendingUp } from 'lucide-react';
import type { CircuitSolution } from '../physics/ac';
import { atPhase, format, resonanceSweep, hasC, hasL, hasR } from '../physics/ac';
import { Panel } from './UI';
import { MAX_UI_FREQUENCY } from '../model';
type Series = {
  quantity?: 'voltage' | 'current' | 'vr' | 'vl' | 'vc' | 'squared' | 'power';
  name: string;
  color: string;
  values: number[];
  xValues?: number[];
  axis?: 'right';
  dashed?: boolean;
};
function closestIndex(values: number[], target: number) {
  let low = 0,
    high = values.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low > 0 && Math.abs(values[low - 1] - target) < Math.abs(values[low] - target)
    ? low - 1
    : low;
}
const W = 720,
  H = 285,
  P = { left: 62, right: 62, top: 28, bottom: 48 };
const iw = W - P.left - P.right,
  ih = H - P.top - P.bottom;
function niceMax(value: number) {
  if (value <= 1e-12) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  return (Math.ceil((value / exponent) * 2) / 2) * exponent;
}
function axisNumber(value: number, digits: number) {
  const magnitude = Math.abs(value);
  if (magnitude > 0 && (magnitude >= 1000 || magnitude < 0.001)) {
    const [mantissa, exponent] = value.toExponential(2).split('e');
    return (
      <>
        {Number(mantissa)}×10
        <tspan baselineShift="super" fontSize="70%">
          {Number(exponent)}
        </tspan>
      </>
    );
  }
  if (magnitude > 0 && magnitude < 1) return Number(value.toPrecision(4)).toString();
  return format(value, digits);
}

const Chart = memo(function Chart({
  series,
  xMax,
  leftMax,
  rightMax,
  xLabel,
  leftLabel,
  rightLabel,
  cursor,
  reference,
  referenceLabel,
  xLog = false,
  xMin = 0,
  marker,
  onPick,
  tooltipExtra,
  bipolar,
  cursorValues,
}: {
  series: Series[];
  xMax: number;
  leftMax: number;
  rightMax?: number;
  xLabel: string;
  leftLabel: string;
  rightLabel?: string;
  cursor?: number;
  reference?: number;
  referenceLabel?: string;
  xLog?: boolean;
  xMin?: number;
  marker?: number;
  onPick?: (x: number) => void;
  tooltipExtra?: (x: number) => string;
  bipolar?: boolean;
  cursorValues?: Partial<Record<NonNullable<Series['quantity']>, number>>;
}) {
  const id = useId().replaceAll(':', '');
  const [hover, setHover] = useState<number | null>(null);
  const signed = bipolar ?? series.some((s) => s.values.some((v) => v < -1e-10));
  const x = useCallback(
    (v: number) =>
      P.left +
      (xLog ? Math.log(v / xMin) / Math.log(xMax / xMin) : (v - xMin) / (xMax - xMin)) * iw,
    [xLog, xMin, xMax],
  );
  const y = useCallback(
    (v: number, max: number) => P.top + ih * (signed ? (1 - v / max) / 2 : 1 - v / max),
    [signed],
  );
  const paths = useMemo(
    () =>
      series.map((s) =>
        s.values
          .map(
            (value, k) =>
              `${k ? 'L' : 'M'}${(s.xValues ? x(s.xValues[k]) : P.left + (iw * k) / (s.values.length - 1)).toFixed(2)},${y(value, s.axis === 'right' ? (rightMax ?? leftMax) : leftMax).toFixed(2)}`,
          )
          .join(' '),
      ),
    [series, leftMax, rightMax, y, x],
  );
  const pointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const local = screenPoint.matrixTransform(matrix.inverse());
    const fraction = Math.max(0, Math.min(1, (local.x - P.left) / iw));
    const value = xLog ? xMin * (xMax / xMin) ** fraction : xMin + (xMax - xMin) * fraction;
    setHover(value);
    if (event.buttons === 1 && onPick) onPick(value);
  };
  const index =
    hover === null
      ? 0
      : series[0].xValues
        ? closestIndex(series[0].xValues, hover)
        : Math.round(
            (xLog
              ? Math.log(hover / xMin) / Math.log(xMax / xMin)
              : (hover - xMin) / (xMax - xMin)) *
              (series[0].values.length - 1),
          );
  const sampleX = series[0].xValues
    ? series[0].xValues[index]
    : xLog
      ? xMin * (xMax / xMin) ** (index / (series[0].values.length - 1))
      : xMin + ((xMax - xMin) * index) / (series[0].values.length - 1);
  return (
    <div className="chart-container">
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${leftLabel} against ${xLabel}${rightLabel ? `, right axis ${rightLabel}` : ''}`}
        onPointerMove={pointer}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(event) => {
          if (onPick) event.currentTarget.setPointerCapture(event.pointerId);
          pointer(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        style={onPick ? { touchAction: 'none' } : undefined}
      >
        <defs>
          <clipPath id={`clip${id}`}>
            <rect x={P.left} y={P.top} width={iw} height={ih} />
          </clipPath>
          <pattern
            id={`grid${id}`}
            width={iw / 20}
            height={ih / 10}
            patternUnits="userSpaceOnUse"
            x={P.left}
            y={P.top}
          >
            <path
              d={`M ${iw / 20} 0 L 0 0 0 ${ih / 10}`}
              fill="none"
              stroke="var(--grid)"
              strokeWidth=".5"
            />
          </pattern>
        </defs>
        <rect x={P.left} y={P.top} width={iw} height={ih} fill={`url(#grid${id})`} />
        {[0, 1, 2, 3, 4].map((k) => {
          const value = signed ? leftMax * (1 - k / 2) : leftMax * (1 - k / 4);
          const yy = P.top + (ih * k) / 4;
          return (
            <g key={k}>
              <path d={`M${P.left} ${yy} H${W - P.right}`} stroke="var(--grid)" />
              <text x={P.left - 10} y={yy + 4} textAnchor="end" className="axis-text">
                {axisNumber(value, Math.abs(leftMax) < 1 ? 2 : 1)}
              </text>
              {rightLabel && (
                <text x={W - P.right + 10} y={yy + 4} className="axis-text">
                  {axisNumber((signed ? 1 - k / 2 : 1 - k / 4) * (rightMax ?? leftMax), 2)}
                </text>
              )}
            </g>
          );
        })}
        {[0, 1, 2, 3, 4].map((k) => {
          const value = xLog ? xMin * (xMax / xMin) ** (k / 4) : xMin + ((xMax - xMin) * k) / 4;
          const xx = P.left + (iw * k) / 4;
          return (
            <g key={k}>
              <path d={`M${xx} ${P.top} V${H - P.bottom}`} stroke="var(--grid)" />
              <text x={xx} y={H - P.bottom + 21} textAnchor="middle" className="axis-text">
                {axisNumber(value, value < 1 ? 2 : 1)}
              </text>
            </g>
          );
        })}
        <text x={P.left} y="14" className="axis-title">
          {leftLabel}
        </text>
        {rightLabel && (
          <text x={W - P.right} y="14" textAnchor="end" className="axis-title">
            {rightLabel}
          </text>
        )}
        <text x={W / 2} y={H - 5} textAnchor="middle" className="axis-title">
          {xLabel}
          {xLog ? ' · logarithmic scale' : ''}
        </text>
        <g clipPath={`url(#clip${id})`}>
          {reference !== undefined && (
            <>
              <path
                d={`M${P.left} ${y(reference, leftMax)} H${W - P.right}`}
                stroke="var(--power)"
                strokeDasharray="6 5"
              />
              <text
                x={W - P.right - 7}
                y={y(reference, leftMax) - 7}
                textAnchor="end"
                className="reference-text"
              >
                {referenceLabel}
              </text>
            </>
          )}
          {series.map((s, i) => (
            <path
              key={s.name}
              d={paths[i]}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeDasharray={s.dashed ? '7 5' : undefined}
              strokeLinejoin="round"
            />
          ))}
          {marker !== undefined && (
            <path
              d={`M${x(marker)} ${P.top} V${H - P.bottom}`}
              stroke="var(--accent)"
              strokeDasharray="4 4"
            />
          )}
          {cursor !== undefined && (
            <>
              <path
                d={`M${x(cursor)} ${P.top} V${H - P.bottom}`}
                stroke="var(--text)"
                opacity=".65"
                strokeDasharray="3 5"
              />
              {series.map((s) => {
                const fraction = xLog
                  ? Math.log(cursor / xMin) / Math.log(xMax / xMin)
                  : (cursor - xMin) / (xMax - xMin);
                const value =
                  (s.quantity ? cursorValues?.[s.quantity] : undefined) ??
                  s.values[
                    s.xValues
                      ? closestIndex(s.xValues, cursor)
                      : Math.max(
                          0,
                          Math.min(
                            s.values.length - 1,
                            Math.round(fraction * (s.values.length - 1)),
                          ),
                        )
                  ];
                return (
                  <circle
                    key={s.name}
                    data-series={s.quantity ?? s.name}
                    data-value={value}
                    cx={x(cursor)}
                    cy={y(value, s.axis === 'right' ? (rightMax ?? leftMax) : leftMax)}
                    r="4"
                    fill={s.color}
                    stroke="var(--panel)"
                    strokeWidth="2"
                  />
                );
              })}
            </>
          )}
          {hover !== null && (
            <path
              d={`M${x(hover)} ${P.top} V${H - P.bottom}`}
              stroke="var(--text-secondary)"
              opacity=".4"
            />
          )}
        </g>
      </svg>
      {hover !== null && (
        <div className="chart-tooltip" role="status" aria-label="Graph sample">
          <b>
            {format(sampleX, 2)} {xLabel.startsWith('Time') ? 'ms' : 'Hz'}
          </b>
          {series.map((s) => (
            <span key={s.name} style={{ color: s.color }}>
              {s.name}: {format(s.values[index], 3)}
            </span>
          ))}
          {tooltipExtra && <span>{tooltipExtra(sampleX)}</span>}
        </div>
      )}
    </div>
  );
});
function downloadCsv(header: string, rows: (number | string)[][], name: string) {
  const blob = new Blob([header + '\n' + rows.map((row) => row.join(',')).join('\n')], {
    type: 'text/csv',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Scope({
  solution: s,
  theta,
  windowMs,
  showComponents = false,
  signalMode = false,
  peakCurrent = 0,
  variant = 'signals',
  rmsReference = false,
}: {
  solution: CircuitSolution;
  theta: number;
  windowMs: number;
  showComponents?: boolean;
  signalMode?: boolean;
  peakCurrent?: number;
  variant?: 'signals' | 'squared' | 'power';
  rmsReference?: boolean;
}) {
  const [voltageVisible, setVoltageVisible] = useState(true);
  const [currentVisible, setCurrentVisible] = useState(true);
  const host = useRef<HTMLElement>(null);
  const cursorMs = (theta / s.omega) * 1000;
  // Pan by complete windows so a low-frequency time cursor remains on screen.
  const startMs = Math.floor(cursorMs / windowMs) * windowMs;
  const data = useMemo(() => {
    const samples = Math.max(800, Math.ceil((windowMs / 1000) * s.frequency * 40));
    return Array.from({ length: samples + 1 }, (_, k) => {
      const timeMs = startMs + (k / samples) * windowMs;
      const phase = (timeMs / 1000) * s.omega;
      const v = atPhase(s, phase);
      const current = signalMode ? peakCurrent * Math.sin(phase) : v.current;
      return { ...v, current, power: v.voltage * current, t: timeMs };
    });
  }, [s, windowMs, signalMode, peakCurrent, startMs]);
  const series = useMemo<Series[]>(() => {
    if (variant === 'squared')
      return [
        {
          quantity: 'squared',
          name: 'v²(t) / V²',
          color: 'var(--voltage)',
          values: data.map((d) => d.voltage ** 2),
        },
      ];
    if (variant === 'power')
      return [
        {
          quantity: 'power',
          name: 'p(t) / W',
          color: 'var(--power)',
          values: data.map((d) => d.power),
        },
      ];
    const traces: Series[] = [];
    if (voltageVisible)
      traces.push({
        quantity: 'voltage',
        name: 'Source voltage / V',
        color: 'var(--voltage)',
        values: data.map((d) => d.voltage),
      });
    if (currentVisible)
      traces.push({
        quantity: 'current',
        name: 'Current / A',
        color: 'var(--current)',
        values: data.map((d) => d.current),
        axis: 'right',
        dashed: true,
      });
    if (showComponents) {
      if (hasR(s.mode))
        traces.push({
          quantity: 'vr',
          name: 'vᵣ / V',
          color: 'var(--resistance)',
          values: data.map((d) => d.vr),
        });
      if (hasL(s.mode))
        traces.push({
          quantity: 'vl',
          name: 'vₗ / V',
          color: 'var(--inductive)',
          values: data.map((d) => d.vl),
        });
      if (hasC(s.mode))
        traces.push({
          quantity: 'vc',
          name: 'v꜀ / V',
          color: 'var(--capacitive)',
          values: data.map((d) => d.vc),
        });
    }
    return traces;
  }, [data, variant, voltageVisible, currentVisible, showComponents, s.mode]);
  const leftMax = niceMax(
    variant === 'squared'
      ? s.voltagePeak ** 2
      : variant === 'power'
        ? s.averagePower + s.apparentPower
        : Math.max(
            s.voltagePeak,
            showComponents ? s.vr * Math.SQRT2 : 0,
            showComponents ? s.vl * Math.SQRT2 : 0,
            showComponents ? s.vc * Math.SQRT2 : 0,
          ),
  );
  const reference =
    variant === 'squared'
      ? s.voltageRms ** 2
      : variant === 'power'
        ? s.averagePower
        : rmsReference
          ? s.voltageRms
          : undefined;
  const instant = atPhase(s, theta);
  const cursorCurrent = signalMode ? peakCurrent * Math.sin(theta) : instant.current;
  return (
    <section className="panel scope-panel" ref={host}>
      <header className="panel-heading">
        <div className="inline-heading">
          <ScanLine size={16} />
          <h3>
            {variant === 'squared'
              ? 'Square, then average'
              : variant === 'power'
                ? 'Instantaneous power'
                : 'Oscilloscope'}
          </h3>
        </div>
        <div className="scope-actions">
          <span className="tiny-tag">{variant === 'signals' ? 'DUAL CHANNEL' : 'LIVE TRACE'}</span>
          <button
            className="icon-button small"
            aria-label="Download graph CSV"
            title="Download graph CSV"
            onClick={() =>
              downloadCsv(
                signalMode
                  ? 'time_ms,voltage_V,current_signal_A,signal_product_VA'
                  : 'time_ms,source_voltage_V,current_A,power_W,vR_V,vL_V,vC_V',
                data.map((d) =>
                  signalMode
                    ? [d.t, d.voltage, d.current, d.power]
                    : [d.t, d.voltage, d.current, d.power, d.vr, d.vl, d.vc],
                ),
                'ac-lab-samples.csv',
              )
            }
          >
            <Download size={14} />
          </button>
          <button
            className="icon-button small"
            aria-label="Fullscreen graph"
            title="Fullscreen graph"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void host.current?.requestFullscreen();
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </header>
      <div className="trace-legend">
        {variant === 'signals' ? (
          <>
            <label>
              <input
                type="checkbox"
                checked={voltageVisible}
                onChange={(e) => setVoltageVisible(e.target.checked)}
              />
              <i className="line voltage" />
              Voltage <span>V · left axis</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={currentVisible}
                onChange={(e) => setCurrentVisible(e.target.checked)}
              />
              <i className="line current dashed" />
              Current <span>A · right axis</span>
            </label>
            {showComponents && (
              <span className="component-legend">
                {hasR(s.mode) && (
                  <>
                    Vᵣ <i className="dot resistance" />
                  </>
                )}
                {hasL(s.mode) && (
                  <>
                    Vₗ <i className="dot inductive" />
                  </>
                )}
                {hasC(s.mode) && (
                  <>
                    V꜀ <i className="dot capacitive" />
                  </>
                )}
              </span>
            )}
          </>
        ) : (
          <>
            <span>
              <i className={`line ${variant === 'power' ? 'power' : 'voltage'}`} />
              {variant === 'power' ? 'Instantaneous p(t)' : 'Squared voltage v²(t)'}
            </span>
            <span>
              <i className="line power dashed" />
              {variant === 'power' ? 'Average power' : 'Mean square'}
            </span>
          </>
        )}
      </div>
      {series.length ? (
        <Chart
          series={series}
          xMin={startMs}
          xMax={startMs + windowMs}
          leftMax={leftMax}
          rightMax={niceMax(signalMode ? peakCurrent : s.currentPeak)}
          xLabel="Time / ms"
          leftLabel={variant === 'squared' ? 'v² / V²' : variant === 'power' ? 'p / W' : 'v / V'}
          rightLabel={variant === 'signals' ? 'i / A' : undefined}
          cursor={cursorMs}
          cursorValues={{
            ...instant,
            current: cursorCurrent,
            power: instant.voltage * cursorCurrent,
            squared: instant.voltage ** 2,
          }}
          bipolar={variant === 'signals' || (variant === 'power' && s.phase !== 0)}
          reference={reference}
          referenceLabel={
            reference !== undefined
              ? `${variant === 'squared' ? '⟨v²⟩' : rmsReference ? 'Vᵣₘₛ' : 'Pₐᵥ'} = ${format(reference, 2)} ${variant === 'squared' ? 'V²' : rmsReference ? 'V' : 'W'}`
              : undefined
          }
        />
      ) : (
        <div className="empty-graph">Enable a trace to view the signal.</div>
      )}
      <div className="scope-bottom">
        <span>
          <i className="dot voltage" />
          {format(s.frequency, 2)} Hz
        </span>
        <span>{format(s.period * 1000, 2)} ms / cycle</span>
        <span>{format(windowMs / 4, 1)} ms / major division</span>
      </div>
    </section>
  );
}
export function ResonancePlot({
  solution: s,
  onFrequency,
}: {
  solution: CircuitSolution;
  onFrequency: (f: number) => void;
}) {
  const [view, setView] = useState<'impedance' | 'current'>('impedance');
  const f0 = s.resonanceFrequency!;
  const { mode, resistance, inductance, capacitance, voltageRms, frequency } = s;
  const low = Math.max(1, Math.min(f0 / 5, s.frequency * 0.8)),
    high = Math.min(MAX_UI_FREQUENCY, Math.max(f0 * 5, s.frequency * 1.2));
  const data = useMemo(
    () =>
      resonanceSweep(
        { mode, resistance, inductance, capacitance, voltageRms, frequency },
        low,
        high,
      ),
    [mode, resistance, inductance, capacitance, voltageRms, frequency, low, high],
  );
  const series = useMemo<Series[]>(
    () =>
      view === 'current'
        ? [
            {
              name: 'I rms / A',
              color: 'var(--current)',
              values: data.map((d) => d.currentRms),
              xValues: data.map((d) => d.frequency),
            },
          ]
        : [
            {
              name: 'R / Ω',
              color: 'var(--resistance)',
              values: data.map((d) => d.r),
              dashed: true,
            },
            { name: 'Xₗ / Ω', color: 'var(--inductive)', values: data.map((d) => d.xl) },
            { name: 'X꜀ / Ω', color: 'var(--capacitive)', values: data.map((d) => d.xc) },
            { name: 'Z / Ω', color: 'var(--voltage)', values: data.map((d) => d.z) },
          ].map((line) => ({ ...line, xValues: data.map((sample) => sample.frequency) })),
    [data, view],
  );
  const max = niceMax(Math.max(...series.flatMap((d) => d.values)));
  return (
    <Panel
      title="Find the sweet spot"
      eyebrow="RESONANCE EXPLORER"
      className="resonance-panel"
      actions={<TrendingUp size={19} />}
    >
      <div className="sweep-toolbar">
        <p>At resonance, reactances cancel and current reaches its maximum.</p>
        <select
          aria-label="Frequency response graph"
          value={view}
          onChange={(e) => setView(e.target.value as 'impedance' | 'current')}
        >
          <option value="impedance">Impedance & reactance</option>
          <option value="current">Current response</option>
        </select>
      </div>
      <div className="trace-legend">
        {series.map((d) => (
          <span key={d.name}>
            <i className={`line ${d.dashed ? 'dashed' : ''}`} style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
        <span className="resonance-key">┊ f₀ = {format(f0, 2)} Hz</span>
      </div>
      <Chart
        series={series}
        xMin={low}
        xMax={high}
        xLog
        leftMax={max}
        xLabel="Frequency / Hz"
        leftLabel={view === 'current' ? 'I rms / A' : 'R, X, Z / Ω'}
        marker={f0}
        cursor={s.frequency}
        onPick={onFrequency}
        tooltipExtra={(f) => `Δf = ${format(f - f0, 2)} Hz`}
      />
      <div className="resonance-readouts">
        <div>
          <span>Resonance frequency</span>
          <b>
            {format(f0, 3)} <small>Hz</small>
          </b>
        </div>
        <div>
          <span>Operating frequency</span>
          <b>
            {format(s.frequency, 3)} <small>Hz</small>
          </b>
        </div>
        <div>
          <span>Distance from resonance</span>
          <b>
            {s.frequency >= f0 ? '+' : ''}
            {format(s.frequency - f0, 3)} <small>Hz</small>
          </b>
        </div>
        <button className="primary-button" onClick={() => onFrequency(f0)}>
          Tune to resonance <span>↗</span>
        </button>
      </div>
      <p className="caption">
        Click or drag the frequency response to tune the source. Resonance means reactance mismatch
        ≤ 0.1%. Both L and C are required.
      </p>
    </Panel>
  );
}
