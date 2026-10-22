import { useMemo, useState } from 'react';
import { ArrowDownRight, Gauge, Pause, Play, Radio, RotateCcw, RotateCw, Zap } from 'lucide-react';
import type { Experiment, LabId } from './model';
import { circuitInput, defaults } from './model';
import {
  atPhase,
  currentLabel,
  engineeringValue,
  format,
  hasC,
  hasL,
  hasR,
  resonanceStatus,
  rmsExperiment,
  solveCircuit,
  TAU,
} from './physics/ac';
import type { CircuitSolution } from './physics/ac';
import { useClock } from './hooks/useClock';
import { Controls } from './components/Controls';
import { Circuit } from './components/Circuit';
import { Phasor } from './components/Phasor';
import { ResonancePlot, Scope } from './components/Plots';
import { Heating } from './components/Heating';
import { Calculations } from './components/Calculations';
import { Challenges } from './components/Challenges';
import { Equation, Metric, Note, Panel } from './components/UI';
const intros: Record<LabId, { eyebrow: string; title: string; description: string }> = {
  waveforms: {
    eyebrow: 'FOLLOW THE SIGNAL',
    title: 'Every cycle tells a story.',
    description:
      'Make the invisible visible. Explore how alternating voltage and current change with time.',
  },
  rms: {
    eyebrow: 'MEASURE WHAT MATTERS',
    title: 'AC, with a DC equivalent.',
    description:
      'Discover why an alternating signal can have zero mean voltage and still produce heat.',
  },
  reactance: {
    eyebrow: 'EXPLORE THE RELATIONSHIPS',
    title: 'A little out of phase.',
    description:
      'Build a circuit. Follow the vectors. Find the frequency where everything comes into balance.',
  },
  power: {
    eyebrow: 'FOLLOW THE ENERGY',
    title: 'Put the phase to work.',
    description:
      'See how timing changes the energy delivered, stored, and returned in every cycle.',
  },
};
function LiveReadings({
  lab,
  p,
  s,
  theta,
}: {
  lab: LabId;
  p: Experiment;
  s: CircuitSolution;
  theta: number;
}) {
  const instant = atPhase(s, theta),
    current =
      p.signalMode && lab === 'waveforms' ? p.peakCurrent * Math.sin(theta) : instant.current;
  const status = resonanceStatus(s);
  const impedanceMeter = engineeringValue(s.z, 'Ω');
  const currentMeter = engineeringValue(s.currentRms, 'A', 3, 0.001);
  const heatingMeter = engineeringValue(s.averagePower, 'W');
  const dcHeatingMeter = engineeringValue(p.dcVoltage ** 2 / p.resistance, 'W', 3);
  return (
    <Panel title="Live measurements" actions={<Radio size={16} />} className="readings-panel">
      <div className="live-label">
        <span className="status-dot active" />
        CALCULATED IN REAL TIME
      </div>
      {lab === 'waveforms' ? (
        <>
          <div className="metrics-grid">
            <Metric
              label="Voltage · v(t)"
              value={format(instant.voltage, 2)}
              unit="V"
              color="voltage"
            />
            <Metric
              label="Current · i(t)"
              value={Math.abs(current) < 0.1 ? format(current * 1000, 1) : format(current, 3)}
              unit={Math.abs(current) < 0.1 ? 'mA' : 'A'}
              color="current"
            />
          </div>
          <div className="reading-rows">
            <div>
              <span>Peak voltage V₀</span>
              <b>{format(p.peakVoltage, 2)} V</b>
            </div>
            <div>
              <span>Peak current I₀</span>
              <b>{currentLabel(p.signalMode ? p.peakCurrent : s.currentPeak)}</b>
            </div>
            <div>
              <span>Period T</span>
              <b>{format(s.period * 1000, 3)} ms</b>
            </div>
            <div>
              <span>Angular frequency ω</span>
              <b>{format(s.omega, 2)} rad/s</b>
            </div>
            <div>
              <span>Cycle time t</span>
              <b>{format((theta / s.omega) * 1000, 3)} ms</b>
            </div>
            <div>
              <span>Angular position θ</span>
              <b>{format((theta * 180) / Math.PI, 1)}°</b>
            </div>
          </div>
          <div className="reading-status">
            {Math.abs(Math.sin(theta)) < 0.001
              ? 'Zero crossing'
              : Math.sin(theta) > 0
                ? 'Positive half-cycle'
                : 'Negative half-cycle'}{' '}
            <ArrowDownRight
              size={14}
              style={{ transform: Math.cos(theta) > 0 ? 'rotate(270deg)' : undefined }}
            />
            <span>{Math.cos(theta) >= 0 ? 'rising' : 'falling'}</span>
          </div>
        </>
      ) : lab === 'rms' ? (
        <>
          <div className="metrics-grid">
            <Metric label="RMS voltage" value={format(s.voltageRms, 3)} unit="V" color="voltage" />
            <Metric label="Average AC power" {...heatingMeter} color="power" />
          </div>
          <div className="reading-rows">
            <div>
              <span>Peak voltage V₀</span>
              <b>{format(p.peakVoltage, 2)} V</b>
            </div>
            <div>
              <span>Mean voltage ⟨v⟩</span>
              <b>0.00 V</b>
            </div>
            <div>
              <span>Mean square ⟨v²⟩</span>
              <b>{format(s.voltageRms ** 2, 3)} V²</b>
            </div>
            <div>
              <span>RMS current</span>
              <b>{currentLabel(s.currentRms)}</b>
            </div>
            <div>
              <span>Instantaneous p(t)</span>
              <b>{format(instant.power, 3)} W</b>
            </div>
            <div>
              <span>DC heating power</span>
              <b>
                {dcHeatingMeter.value} {dcHeatingMeter.unit}
              </b>
            </div>
          </div>
          <div className="reading-status">
            {rmsExperiment(p.peakVoltage, p.resistance, p.dcVoltage).matched
              ? 'Equal heating within tolerance'
              : 'Heating powers differ'}
          </div>
        </>
      ) : (
        <>
          <div className="metrics-grid">
            <Metric label="Impedance Z" {...impedanceMeter} color="voltage" />
            <Metric label="RMS current" {...currentMeter} color="current" />
          </div>
          <div className="reading-rows">
            <div>
              <span>Source frequency</span>
              <b>{format(s.frequency, 3)} Hz</b>
            </div>
            {hasR(s.mode) && (
              <div>
                <span>Resistance R</span>
                <b>{format(s.r, 2)} Ω</b>
              </div>
            )}
            {hasL(s.mode) && (
              <>
                <div>
                  <span>Inductance L</span>
                  <b>{format(s.inductance * 1000, 2)} mH</b>
                </div>
                <div>
                  <span className="inductive">Inductive reactance Xₗ</span>
                  <b>{format(s.xl, 3)} Ω</b>
                </div>
              </>
            )}
            {hasC(s.mode) && (
              <>
                <div>
                  <span>Capacitance C</span>
                  <b>{format(s.capacitance * 1e6, 2)} µF</b>
                </div>
                <div>
                  <span className="capacitive">Capacitive reactance X꜀</span>
                  <b>{format(s.xc, 3)} Ω</b>
                </div>
              </>
            )}
            <div>
              <span>Phase angle φ</span>
              <b>{format(s.phaseDegrees, 2)}°</b>
            </div>
            <div>
              <span>Power factor cos φ</span>
              <b>{format(s.pf, 4)}</b>
            </div>
            <div>
              <span>Average power</span>
              <b>{format(s.averagePower, 3)} W</b>
            </div>
          </div>
          <div className={`reading-status ${status === 'At resonance' ? 'resonant' : ''}`}>
            {status ??
              (s.character === 'in phase'
                ? 'In phase'
                : `Current ${s.character === 'lagging' ? 'lags' : 'leads'} voltage`)}
          </div>
        </>
      )}
    </Panel>
  );
}
function PowerFactor({ s }: { s: CircuitSolution }) {
  const scale = 80 / Math.max(s.averagePower, Math.abs(s.reactivePower), 1e-12);
  const baseY = s.reactivePower >= 0 ? 100 : 20;
  return (
    <Panel title="Power factor" actions={<Gauge size={16} />} className="pf-panel">
      <div className="pf-gauge">
        <svg viewBox="0 0 220 126" role="img" aria-label={`Power factor ${format(s.pf, 4)}`}>
          <path
            d="M24 110 A86 86 0 0 1 196 110"
            pathLength="100"
            fill="none"
            stroke="var(--surface-raised)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M24 110 A86 86 0 0 1 196 110"
            pathLength="100"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${s.pf * 100} 100`}
          />
          <text
            x="110"
            y="96"
            textAnchor="middle"
            fill="var(--text)"
            fontSize="35"
            fontWeight="500"
          >
            {format(s.pf, 3)}
          </text>
          <text x="110" y="119" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">
            {s.character === 'in phase' ? 'IN PHASE' : `CURRENT ${s.character.toUpperCase()}`}
          </text>
        </svg>
      </div>
      <div className="power-triangle">
        <svg
          viewBox="0 0 235 118"
          role="img"
          aria-label={`Power triangle: P ${format(s.averagePower)} W, Q ${format(s.reactivePower)} var, S ${format(s.apparentPower)} VA`}
        >
          <path
            d={`M65 ${baseY} H${65 + scale * s.averagePower} V${baseY - scale * s.reactivePower} Z`}
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <text x="115" y="113" fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
            P = {format(s.averagePower, 2)} W
          </text>
          <text x="115" y="14" fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
            S = {format(s.apparentPower, 2)} VA
          </text>
        </svg>
        <span>Q = {format(s.reactivePower, 2)} var</span>
      </div>
      <p className="caption">
        <Equation tex={String.raw`S^2=P^2+Q^2`} />. Q is positive for inductive circuits and
        negative for capacitive circuits.
      </p>
    </Panel>
  );
}
export default function Laboratory({
  lab,
  p,
  onChange,
}: {
  lab: LabId;
  p: Experiment;
  onChange: (p: Experiment) => void;
}) {
  const clock = useClock();
  const [resetVersion, setResetVersion] = useState(0);
  const [components, setComponents] = useState(false);
  const [phasor, setPhasor] = useState(true);
  const s = useMemo(() => solveCircuit(circuitInput(p, lab)), [p, lab]);
  const windowMs = p.windowMs < 0 ? s.period * 2000 : p.windowMs;
  const intro = intros[lab];
  const circuitLab = lab === 'reactance' || lab === 'power';
  const reset = () => {
    onChange({ ...defaults[lab] });
    setResetVersion((v) => v + 1);
    clock.reset();
  };
  return (
    <div className="lab-content" role="tabpanel" id={`panel-${lab}`} aria-labelledby={`tab-${lab}`}>
      <div className="lab-intro">
        <div>
          <span className="eyebrow">{intro.eyebrow}</span>
          <h2>{intro.title}</h2>
          <p>{intro.description}</p>
        </div>
        <div className="simulation-state">
          <span className={`status-dot ${clock.playing ? 'active' : ''}`} />
          {clock.playing ? 'Simulation running' : 'Simulation paused'}
          <span className="state-sub">IDEAL AC · SINE WAVE</span>
        </div>
      </div>
      <div className="experiment-grid">
        <Controls key={resetVersion} lab={lab} p={p} onChange={onChange} onReset={reset} />
        <div className="visual-column">
          {lab === 'rms' ? (
            <Heating peak={p.peakVoltage} resistance={p.resistance} dcVoltage={p.dcVoltage} />
          ) : (
            <Circuit
              solution={s}
              theta={clock.theta}
              signalMode={lab === 'waveforms' && p.signalMode}
              peakCurrent={p.peakCurrent}
            />
          )}
          <Scope
            solution={s}
            theta={clock.theta}
            windowMs={windowMs}
            showComponents={circuitLab && components}
            signalMode={lab === 'waveforms' && p.signalMode}
            peakCurrent={p.peakCurrent}
            rmsReference={lab === 'rms'}
          />
          <div className="panel playback-panel">
            <div className="playback-toolbar">
              <div className="playback-buttons">
                <button
                  className={`play-button ${clock.playing ? 'is-playing' : ''}`}
                  onClick={() => clock.setPlaying(!clock.playing)}
                  aria-label={clock.playing ? 'Pause simulation' : 'Play simulation'}
                >
                  {clock.playing ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                  <span>{clock.playing ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label="Replay simulation"
                  title="Replay from the start"
                  onClick={clock.replay}
                >
                  <RotateCw size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Reset playback"
                  title="Reset playback"
                  onClick={clock.reset}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <div className="playback-options">
                <label>
                  View speed
                  <select
                    aria-label="Playback speed"
                    value={clock.speed}
                    onChange={(e) => clock.setSpeed(Number(e.target.value))}
                  >
                    <option value="1">1×</option>
                    <option value="0.5">0.5×</option>
                    <option value="0.25">0.25×</option>
                    <option value="0.1">0.1×</option>
                  </select>
                </label>
                <label>
                  Window
                  <select
                    aria-label="Time window"
                    value={p.windowMs}
                    onChange={(e) => onChange({ ...p, windowMs: Number(e.target.value) })}
                  >
                    <option value={-2}>2 cycles</option>
                    {[20, 40, 60, 100, 200].map((v) => (
                      <option value={v} key={v}>
                        {v} ms
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="scrubber">
              <div>
                <label htmlFor="phase-cursor">Cycle phase</label>
                <output htmlFor="phase-cursor" aria-live="off">
                  {format((clock.theta / TAU) * 360, 1)}°{' '}
                  <span>/ {format((clock.theta / s.omega) * 1000, 3)} ms</span>
                </output>
              </div>
              <input
                id="phase-cursor"
                aria-label="Cycle phase"
                type="range"
                min="0"
                max="360"
                step="0.1"
                value={(clock.theta / TAU) * 360}
                onChange={(e) => clock.scrub(Number(e.target.value) / 360)}
              />
              <div className="phase-ticks">
                <span>0°</span>
                <span>90°</span>
                <span>180°</span>
                <span>270°</span>
                <span>360°</span>
              </div>
            </div>
            <p className="caption">
              Slow-motion view: one cycle takes {format(8 / clock.speed, 0)} s on screen. The
              physical period stays {format(s.period * 1000, 3)} ms.
            </p>
          </div>
          {circuitLab && (
            <div className="visual-options">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={components}
                  onChange={(e) => setComponents(e.target.checked)}
                />
                Component voltage traces
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={phasor}
                  onChange={(e) => setPhasor(e.target.checked)}
                />
                Phasor view
              </label>
            </div>
          )}
          {lab === 'power' && (
            <Scope variant="power" solution={s} theta={clock.theta} windowMs={windowMs} />
          )}
        </div>
        <aside className="information-column">
          <LiveReadings lab={lab} p={p} s={s} theta={clock.theta} />
          {lab === 'power' ? (
            <PowerFactor s={s} />
          ) : lab === 'rms' ? (
            <Panel title="The RMS recipe" className="rms-recipe">
              <div>
                <span className="recipe-symbol">x²</span>
                <p>
                  <b>Square</b>Both half-cycles become positive.
                </p>
              </div>
              <div>
                <span className="recipe-symbol">x̄</span>
                <p>
                  <b>Mean</b>
                  {format(p.peakVoltage ** 2 / 2, 3)} V² over a full cycle.
                </p>
              </div>
              <div>
                <span className="recipe-symbol">√</span>
                <p>
                  <b>Root</b>
                  {format(s.voltageRms, 3)} V — back to volts.
                </p>
              </div>
              <Equation block tex={String.raw`V_{\mathrm{rms}}=\frac{V_0}{\sqrt2}`} />
            </Panel>
          ) : (
            phasor && (
              <Phasor
                solution={s}
                theta={clock.theta}
                signalMode={lab === 'waveforms' && p.signalMode}
              />
            )
          )}
          {lab === 'power' && phasor && <Phasor solution={s} theta={clock.theta} />}
        </aside>
      </div>
      {lab === 'rms' && (
        <div className="secondary-grid">
          <Scope variant="squared" solution={s} theta={clock.theta} windowMs={windowMs} />
          <Panel
            title="Zero mean. Real heating."
            className="insight-panel"
            actions={<Zap size={19} />}
          >
            <p>
              The positive and negative voltages cancel over a cycle. Their heating effects add.
            </p>
            <Equation
              block
              tex={String.raw`\langle v\rangle=0,\quad\langle v^2\rangle=\frac{V_0^2}{2}`}
            />
            <p>
              RMS voltage is always <b>70.71% of the peak</b> for a sine wave. It tells you the
              equivalent DC heating effect.
            </p>
            <Note>
              Instantaneous power oscillates at twice the voltage frequency and remains nonnegative
              in a resistor.
            </Note>
          </Panel>
        </div>
      )}
      {lab === 'reactance' && s.resonanceFrequency !== null && (
        <ResonancePlot
          solution={s}
          onFrequency={(f) => onChange({ ...p, frequency: Math.max(1, f) })}
        />
      )}
      {lab === 'power' && (
        <div className="energy-insight">
          <Zap size={21} />
          <div>
            <b>Energy can flow both ways.</b>
            <p>
              Positive p(t): the source delivers energy. Negative p(t): reactive elements return
              stored energy. Only the resistor dissipates energy on average.
            </p>
            {s.mode === 'RLC' && (
              <p>
                In this series compensation experiment, tuning C changes Z, current, and real power.
                A higher power factor does not necessarily mean lower power consumption.
              </p>
            )}
          </div>
        </div>
      )}
      <Calculations lab={lab} p={p} solution={s} theta={clock.theta} />
      <Challenges
        key={lab}
        lab={lab}
        p={p}
        solution={s}
        theta={clock.theta}
        playing={clock.playing}
        onPrepare={() => {
          onChange({
            ...p,
            mode: 'RLC',
            frequency: 50,
            resistance: 20,
            inductance: 0.1,
            capacitance: 40e-6,
          });
          clock.reset();
        }}
      />
    </div>
  );
}
