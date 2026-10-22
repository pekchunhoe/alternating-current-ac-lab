import { memo } from 'react';
import { Activity } from 'lucide-react';
import type { CircuitSolution } from '../physics/ac';
import { atPhase, currentLabel, format, hasC, hasL, hasR } from '../physics/ac';
export const Circuit = memo(function Circuit({
  solution: s,
  theta,
  signalMode = false,
  peakCurrent = 0,
}: {
  solution: CircuitSolution;
  theta: number;
  signalMode?: boolean;
  peakCurrent?: number;
}) {
  const instant = atPhase(s, theta);
  const current = signalMode ? peakCurrent * Math.sin(theta) : instant.current;
  const amplitude = signalMode ? peakCurrent : s.currentPeak;
  const fraction = amplitude ? current / amplitude : 0;
  const active = Math.abs(fraction) > 1e-9;
  const components = [
    ...(hasR(s.mode) ? ['R'] : []),
    ...(hasL(s.mode) ? ['L'] : []),
    ...(hasC(s.mode) ? ['C'] : []),
  ];
  // Signed integrated sine produces reversible schematic charge motion.
  const offset = Math.cos(theta - s.phase) * 27;
  return (
    <section className="panel circuit-panel">
      <header className="panel-heading">
        <div className="inline-heading">
          <Activity size={16} />
          <h3>{signalMode ? 'Independent signal generator' : 'The circuit bench'}</h3>
        </div>
        <span className="tiny-tag">
          {signalMode ? 'SIGNAL EXPLORATION' : `${s.mode} · SERIES CIRCUIT`}
        </span>
      </header>
      {signalMode ? (
        <div className="signal-explainer">
          <div className="signal-icon">∿</div>
          <div>
            <h4>Two signals. One frequency.</h4>
            <p>
              Voltage and current amplitudes are independent here. No physical load is connected.
            </p>
          </div>
        </div>
      ) : (
        <svg
          className="circuit-svg"
          viewBox="0 0 600 215"
          role="img"
          aria-label={`${s.mode} series circuit. Current ${active ? (current > 0 ? 'clockwise' : 'anticlockwise') : 'at zero crossing'}.`}
        >
          <defs>
            <pattern id="bench-dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".12" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="600" height="215" fill="url(#bench-dots)" />
          <g
            fill="none"
            stroke="var(--wire)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M83 78 V43 H125 M83 132 V174 H536 V43 H545" />
            <circle cx="83" cy="105" r="27" stroke="var(--voltage)" />
            <path d="M65 105 C71 85 77 85 83 105 S95 125 101 105" stroke="var(--voltage)" />
            {components.map((part, i) => {
              const width = 420 / components.length;
              const x = 125 + i * width;
              const center = x + width / 2;
              return (
                <g key={part}>
                  <path d={`M${x} 43 H${center - 32} M${center + 32} 43 H${x + width}`} />
                  {part === 'R' && (
                    <path
                      d={`M${center - 32} 43 l7 -11 10 22 10 -22 10 22 10 -22 10 22 7 -11`}
                      stroke="var(--resistance)"
                    />
                  )}
                  {part === 'L' && (
                    <path
                      d={`M${center - 32} 43 c0 -22 16 -22 16 0 c0 -22 16 -22 16 0 c0 -22 16 -22 16 0 c0 -22 16 -22 16 0`}
                      stroke="var(--inductive)"
                    />
                  )}
                  {part === 'C' && (
                    <g stroke="var(--capacitive)">
                      <path
                        d={`M${center - 32} 43 H${center - 6} M${center + 6} 43 H${center + 32} M${center - 6} 25 V61 M${center + 6} 25 V61`}
                      />
                    </g>
                  )}
                  <text
                    x={center}
                    y="91"
                    textAnchor="middle"
                    fill={
                      part === 'R'
                        ? 'var(--resistance)'
                        : part === 'L'
                          ? 'var(--inductive)'
                          : 'var(--capacitive)'
                    }
                    stroke="none"
                    className="svg-component"
                  >
                    {part} ={' '}
                    {part === 'R'
                      ? `${format(s.r, 0)} Ω`
                      : part === 'L'
                        ? `${format(s.inductance * 1000, 0)} mH`
                        : `${format(s.capacitance * 1e6, 0)} µF`}
                  </text>
                </g>
              );
            })}
          </g>
          <text x="30" y="103" textAnchor="middle" className="svg-label" fill="var(--voltage)">
            {Math.abs(instant.voltage) < s.voltagePeak * 1e-9
              ? '0'
              : instant.voltage > 0
                ? '+'
                : '−'}
          </text>
          <text x="30" y="123" textAnchor="middle" className="svg-label" fill="var(--voltage)">
            {Math.abs(instant.voltage) < s.voltagePeak * 1e-9
              ? ''
              : instant.voltage > 0
                ? '−'
                : '+'}
          </text>
          <text
            x="83"
            y="204"
            textAnchor="middle"
            className="svg-label"
            fill="var(--text-secondary)"
          >
            {format(s.voltageRms, 2)} V rms
          </text>
          <g opacity={active ? 0.3 + Math.abs(fraction) * 0.7 : 0.15} fill="var(--current)">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <circle key={i} cx={155 + i * 50 + offset} cy="174" r="3" />
            ))}
            <path
              data-testid="current-direction"
              data-direction={active ? (current > 0 ? 'forward' : 'reverse') : 'zero'}
              d={current >= 0 ? 'M388 151 l10 -5 v10 z' : 'M398 151 l-10 -5 v10 z'}
            />
          </g>
          <text x="298" y="145" textAnchor="middle" className="svg-label" fill="var(--current)">
            i(t) = {currentLabel(active ? current : 0)}
          </text>
          <text x="535" y="201" textAnchor="end" className="svg-micro" fill="var(--text-muted)">
            +i : clockwise
          </text>
        </svg>
      )}
      <div className="bench-footer">
        <span className={`status-dot ${active ? 'active' : ''}`} />
        <span>
          {active
            ? `${current > 0 ? 'Forward' : 'Reverse'} conventional current`
            : 'Current reversal · zero crossing'}
        </span>
        <span className="bench-disclaimer">Schematic flow indicators</span>
      </div>
    </section>
  );
});
