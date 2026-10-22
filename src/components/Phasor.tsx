import { useState } from 'react';
import { Orbit } from 'lucide-react';
import type { CircuitSolution } from '../physics/ac';
import { format, hasC, hasL, hasR } from '../physics/ac';
import { Panel } from './UI';
export function Phasor({
  solution: s,
  theta,
  signalMode = false,
}: {
  solution: CircuitSolution;
  theta: number;
  signalMode?: boolean;
}) {
  const [rotate, setRotate] = useState(true);
  const alpha = rotate ? theta - s.phase : 0;
  const scale = 85 / Math.max(s.voltageRms, s.vr, s.vl, s.vc, 1e-12);
  const point = (x: number, y: number) => [
    135 + scale * (x * Math.cos(alpha) - y * Math.sin(alpha)),
    125 - scale * (x * Math.sin(alpha) + y * Math.cos(alpha)),
  ];
  const arrow = (id: string, x: number, y: number, color: string, dashed = false) => {
    const [px, py] = point(x, y);
    const angle = (Math.atan2(125 - py, px - 135) * 180) / Math.PI;
    return (
      <g key={id} data-vector={id}>
        <path
          d={`M135 125 L${px} ${py}`}
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={dashed ? '5 3' : undefined}
        />
        <path
          d="M0 0 l-7 -3 v6 z"
          fill={color}
          transform={`translate(${px},${py}) rotate(${-angle})`}
        />
        <text
          x={id === 'I' ? px + (px >= 135 ? -14 : 14) : px + (px >= 135 ? 7 : -7)}
          y={py + (id === 'VS' ? 17 : -7)}
          textAnchor={id === 'I' ? (px >= 135 ? 'end' : 'start') : px >= 135 ? 'start' : 'end'}
          fill={color}
          fontSize="12"
        >
          {id === 'I' ? (
            'I'
          ) : (
            <>
              V
              <tspan baselineShift="sub" fontSize="9">
                {id === 'VS' ? 's' : id[1]}
              </tspan>
            </>
          )}
        </text>
      </g>
    );
  };
  const [rx, ry] = point(s.vr, 0);
  const [lx, ly] = point(s.vr, s.vl);
  const [sx, sy] = point(s.vr, s.vl - s.vc);
  return (
    <Panel title="Phasor view" actions={<Orbit size={15} />} className="phasor-panel">
      <svg
        viewBox="0 0 270 245"
        className="phasor-svg"
        role="img"
        aria-label={`Voltage phase ${format(s.phaseDegrees, 1)} degrees relative to current. ${rotate ? 'Rotating sine projection' : 'Current reference frame'}.`}
      >
        <circle cx="135" cy="125" r="85" fill="none" stroke="var(--border)" strokeDasharray="3 5" />
        <path d="M25 125 H245 M135 15 V230" stroke="var(--border)" />
        {!signalMode && (
          <path
            data-testid="phasor-sum"
            d={`M${rx} ${ry} L${lx} ${ly} L${sx} ${sy}`}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
        )}
        {!signalMode && hasR(s.mode) && arrow('VR', s.vr, 0, 'var(--resistance)')}
        {!signalMode && hasL(s.mode) && arrow('VL', 0, s.vl, 'var(--inductive)')}
        {!signalMode && hasC(s.mode) && arrow('VC', 0, -s.vc, 'var(--capacitive)')}
        {arrow('VS', s.vr, s.vl - s.vc, 'var(--voltage)')}
        {arrow('I', Math.max(s.voltageRms, s.vl, s.vc) * 0.65, 0, 'var(--current)', true)}
        <circle cx="135" cy="125" r="3" fill="var(--text)" />
      </svg>
      <div className="phasor-meta">
        <span>
          φ = <b>{format(s.phaseDegrees, 1)}°</b>
        </span>
        <label className="toggle-label">
          <input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} />{' '}
          Rotate
        </label>
      </div>
      <p className="caption">
        {rotate
          ? 'Voltage vectors use RMS magnitudes: multiply their vertical projections by √2 for instantaneous voltage.'
          : 'Current is the reference axis in this fixed construction.'}{' '}
        I shows direction on a separate scale.{' '}
        {signalMode
          ? 'These are independent in-phase signals; no component voltages are implied.'
          : 'Dashed segments add Vₗ and −V꜀ to Vᵣ on one voltage scale.'}
      </p>
    </Panel>
  );
}
