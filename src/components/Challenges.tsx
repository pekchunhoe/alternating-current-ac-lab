import { useState } from 'react';
import { ArrowUpRight, Check, Lightbulb, RotateCcw, Target } from 'lucide-react';
import type { Experiment, LabId } from '../model';
import type { CircuitSolution } from '../physics/ac';
import { atPhase, format, resonanceFrequency, resonanceStatus, rmsExperiment } from '../physics/ac';
import { Panel, Equation } from './UI';
import { texNumber as n } from '../physics/notation';
type Task = {
  title: string;
  objective: string;
  hint: string;
  kind: 'experiment' | 'number' | 'concept';
  unit?: string;
};
const tasks: Record<LabId, Task[]> = {
  waveforms: [
    {
      title: 'Locate the Voltage Maximum',
      objective:
        'Pause and move the cycle-phase cursor to the positive voltage peak. Reach at least 99.9% of peak voltage.',
      hint: 'A sine reaches its positive maximum a quarter of a cycle after its rising zero crossing.',
      kind: 'experiment',
    },
    {
      title: 'Find the Zero Crossings',
      objective: 'Pause at a current reversal. Reach within 1% of peak current from zero.',
      hint: 'Look at the start and the middle of a cycle, where sine changes sign.',
      kind: 'experiment',
    },
    {
      title: 'Match the Period',
      objective: 'Adjust frequency to obtain a period of 25.00 ms (within 0.1 ms).',
      hint: 'Frequency is the reciprocal of period. Convert milliseconds to seconds.',
      kind: 'experiment',
    },
    {
      title: 'Determine Angular Frequency',
      objective: 'Calculate angular frequency for the current frequency setting (within 1%).',
      hint: 'Multiply frequency by 2π.',
      kind: 'number',
      unit: 'rad/s',
    },
    {
      title: 'Locate the Negative Peak',
      objective: 'Pause at the negative voltage peak. Reach at least 99.9% of its magnitude.',
      hint: 'Move three quarters of the way through the cycle.',
      kind: 'experiment',
    },
  ],
  rms: [
    {
      title: 'Equal Heating Challenge',
      objective:
        'Adjust the DC voltage until the identical resistors produce equal average heating, within 1%.',
      hint: 'The matching DC voltage is the peak AC voltage divided by √2.',
      kind: 'experiment',
    },
    {
      title: 'Calculate RMS Voltage',
      objective: 'Use the selected peak voltage to calculate the RMS voltage (within 1%).',
      hint: 'Square, mean, root: a sine has mean square equal to half its peak squared.',
      kind: 'number',
      unit: 'V',
    },
    {
      title: 'Determine Average Power',
      objective: 'Calculate average AC heating power for the selected resistor (within 1%).',
      hint: 'Divide the square of RMS voltage by resistance.',
      kind: 'number',
      unit: 'W',
    },
  ],
  reactance: [
    {
      title: 'Tune to Resonance',
      objective:
        'Select an RLC circuit and tune frequency until the reactance mismatch is no more than 0.1%.',
      hint: 'At resonance, inductive and capacitive reactances are equal. Try around 50 Hz with the default components.',
      kind: 'experiment',
    },
    {
      title: 'Identify the Phase Relationship',
      objective: 'Predict the current phase relative to source voltage for the present circuit.',
      hint: 'Net positive reactance is inductive; net negative reactance is capacitive.',
      kind: 'concept',
    },
    {
      title: 'Calculate Reactance',
      objective:
        'Calculate Xₗ if an inductor is present; otherwise calculate X꜀ for a capacitor (within 1%). Select a reactive circuit.',
      hint: 'For inductive reactance, multiply 2π, frequency and inductance. For capacitive reactance, take the reciprocal of the product of 2π, frequency and capacitance. Use henries and farads.',
      kind: 'number',
      unit: 'Ω',
    },
    {
      title: 'Determine the Impedance',
      objective: 'Calculate the magnitude of the present circuit impedance (within 1%).',
      hint: 'Use the hypotenuse of resistance and net reactance.',
      kind: 'number',
      unit: 'Ω',
    },
    {
      title: 'Predict a Capacitance Change',
      objective:
        'In an RLC circuit, what happens to the resonant frequency when capacitance increases?',
      hint: 'Resonant frequency is inversely proportional to √C.',
      kind: 'concept',
    },
  ],
  power: [
    {
      title: 'Improve the Power Factor',
      objective:
        'In an RLC series circuit, tune capacitance to achieve a power factor of at least 0.995.',
      hint: 'Reduce the magnitude of the net reactance. At 50 Hz with 100 mH, try about 101 µF.',
      kind: 'experiment',
    },
    {
      title: 'Determine Average Power',
      objective:
        'Calculate average real power using the present RMS values and phase angle (within 1%).',
      hint: 'Multiply RMS voltage, RMS current and the cosine of the phase angle.',
      kind: 'number',
      unit: 'W',
    },
    {
      title: 'Explain the Power Factor',
      objective: 'Predict the phase relationship from the present circuit conditions.',
      hint: 'Power factor is cos φ. Leading current means a negative phase angle.',
      kind: 'concept',
    },
    {
      title: 'Inspect Instantaneous Power',
      objective:
        'Pause at an instant when energy is being returned to the source, so p(t) is negative. Use a reactive circuit.',
      hint: 'Negative power occurs when voltage and current have opposite signs.',
      kind: 'experiment',
    },
  ],
};
export function Challenges({
  lab,
  p,
  solution: s,
  theta,
  playing,
  onPrepare,
}: {
  lab: LabId;
  p: Experiment;
  solution: CircuitSolution;
  theta: number;
  playing: boolean;
  onPrepare: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const task = tasks[lab][index];
  const instant = atPhase(s, theta);
  const close = (target: number) =>
    answer.trim() !== '' &&
    Number.isFinite(Number(answer)) &&
    Math.abs(Number(answer) - target) <= Math.abs(target) * 0.01 * (1 + 1e-12);
  let success = false,
    feedback = '',
    solution = '',
    solutionTex = '';
  if (lab === 'waveforms') {
    if (index === 0 || index === 4) {
      const target = index === 0 ? 1 : -1;
      success = !playing && Math.sin(theta) * target >= 0.999;
      feedback = `Voltage: ${format(instant.voltage, 3)} / ${format(p.peakVoltage, 2)} V peak.`;
      solution = `The ${target > 0 ? 'positive' : 'negative'} peak occurs at ${target > 0 ? '90' : '270'}°, or ${format(s.period * 1000 * (target > 0 ? 0.25 : 0.75), 3)} ms.`;
    }
    if (index === 1) {
      success = !playing && Math.abs(Math.sin(theta)) <= 0.01;
      feedback = `Phase: ${format((theta * 180) / Math.PI, 1)}°. ${playing ? 'Pause to inspect the crossing.' : ''}`;
      solution = 'Current reverses at 0° and 180° (and at the equivalent 360° point).';
    }
    if (index === 2) {
      success = Math.abs(s.period * 1000 - 25) <= 0.1;
      feedback = `Present period: ${format(s.period * 1000, 3)} ms.`;
      solution = 'A 25 ms period requires a frequency of 40 Hz.';
      solutionTex = String.raw`f=\frac1T=\frac1{0.025\;\mathrm s}=40\;\mathrm{Hz}`;
    }
    if (index === 3) {
      success = close(s.omega);
      feedback = `Frequency: ${format(s.frequency, 2)} Hz.`;
      solution =
        'Angular frequency is the rate of change of phase, measured in radians per second.';
      solutionTex = String.raw`\omega=2\pi f=${n(s.omega)}\;\mathrm{rad\,s^{-1}}`;
    }
  } else if (lab === 'rms') {
    const h = rmsExperiment(p.peakVoltage, p.resistance, p.dcVoltage);
    if (index === 0) {
      success = h.matched;
      feedback = `Power difference: ${format(h.difference, 5)} W (${h.relativeError === null ? 'no AC power reference' : `${format(h.relativeError * 100, 2)}%`}).`;
      solution = `The equivalent DC voltage is ${format(h.voltageRms, 4)} V. The tolerance is 1% of the calculated AC heating power, including at low power.`;
    }
    if (index === 1) {
      success = close(h.voltageRms);
      feedback = `Peak voltage: ${format(p.peakVoltage, 2)} V.`;
      solution = 'For a sine wave, divide the peak voltage by the square root of two.';
      solutionTex = String.raw`V_{\mathrm{rms}}=\frac{V_0}{\sqrt2}=${n(h.voltageRms)}\;\mathrm V`;
    }
    if (index === 2) {
      success = close(h.acPower);
      feedback = `Resistance: ${format(p.resistance, 2)} Ω.`;
      solution = 'The resistor dissipates the same average power at the equivalent DC voltage.';
      solutionTex = String.raw`P_{\mathrm{av}}=\frac{V_{\mathrm{rms}}^2}{R}=${n(h.acPower)}\;\mathrm W`;
    }
  } else if (lab === 'reactance') {
    if (index === 0) {
      success = s.mode === 'RLC' && resonanceStatus(s) === 'At resonance';
      feedback =
        s.mode === 'RLC'
          ? `Reactance mismatch: ${format((Math.abs(s.xl - s.xc) / Math.max(s.xl, s.xc)) * 100, 3)}%.`
          : 'Select RLC in experiment setup.';
      solution = s.resonanceFrequency
        ? `For these components, the resonance frequency is ${format(s.resonanceFrequency, 4)} Hz. The impedance then equals the resistance, and voltage and current are in phase.`
        : 'Both inductance and capacitance are needed for this resonance experiment.';
    }
    if (index === 1) {
      success = answer === s.character;
      feedback = `Net reactance: ${format(s.x, 3)} Ω.`;
      solution = `Current is ${s.character}. The signed source-voltage phase is:`;
      solutionTex = String.raw`\phi=${n(s.phaseDegrees)}^\circ`;
    }
    if (index === 2) {
      const target = s.xl || s.xc;
      success = target > 0 && close(target);
      feedback = `${s.xl ? 'Inductance' : 'Capacitance'} at ${format(s.frequency, 2)} Hz.`;
      solution = target
        ? `The reactance is ${format(target, 4)} Ω.`
        : 'Select a circuit containing L or C.';
    }
    if (index === 3) {
      success = close(s.z);
      feedback = `R = ${format(s.r, 2)} Ω; net X = ${format(s.x, 2)} Ω.`;
      solution =
        'Impedance combines resistance with the net reactance as perpendicular components.';
      solutionTex = String.raw`Z=\sqrt{R^2+(X_L-X_C)^2}=${n(s.z)}\;\Omega`;
    }
    if (index === 4) {
      const changed = resonanceFrequency(s.inductance, s.capacitance * 1.1);
      const prediction =
        s.resonanceFrequency !== null && changed < s.resonanceFrequency ? 'decreases' : 'increases';
      success = s.mode === 'RLC' && answer === prediction;
      feedback =
        s.mode === 'RLC'
          ? 'Predict the effect of increasing capacitance by 10%, keeping L fixed.'
          : 'Select RLC to explore resonance.';
      solution = `With 10% more capacitance, the calculated resonance is ${format(changed, 4)} Hz. Increasing C decreases f₀ because it is proportional to 1/√C.`;
    }
  } else {
    if (index === 0) {
      success = s.mode === 'RLC' && s.pf >= 0.995;
      feedback = `Present power factor: ${format(s.pf, 4)}. ${s.mode !== 'RLC' ? 'Choose RLC to begin.' : ''}`;
      solution =
        'Series reactive compensation cancels net reactance. At fixed source voltage, current and real power increase toward resonance; this is not parallel capacitor-bank correction.';
    }
    if (index === 1) {
      success = close(s.averagePower);
      feedback = `Vᵣₘₛ = ${format(s.voltageRms, 2)} V; Iᵣₘₛ = ${format(s.currentRms, 4)} A; PF = ${format(s.pf, 4)}.`;
      solution = 'Multiply the RMS voltage and RMS current by the power factor.';
      solutionTex = String.raw`\begin{aligned}P_{\mathrm{av}}&=V_{\mathrm{rms}}I_{\mathrm{rms}}\cos\phi\\&=${n(s.averagePower)}\;\mathrm W\end{aligned}`;
    }
    if (index === 2) {
      success = answer === s.character;
      feedback = `Phase angle: ${format(s.phaseDegrees, 2)}°.`;
      solution = `Current is ${s.character}. The power factor is the cosine of the phase angle.`;
      solutionTex = String.raw`\mathrm{PF}=\cos\phi=${n(s.pf)}`;
    }
    if (index === 3) {
      success = !playing && instant.power < -16 * Number.EPSILON * s.apparentPower;
      feedback = `Instantaneous power: ${format(instant.power, 3)} W. ${playing ? 'Pause to inspect an instant.' : ''}`;
      solution =
        'When voltage and current have opposite signs, instantaneous power is negative: stored energy is returning to the source. A pure resistor never returns energy.';
      solutionTex = String.raw`p(t)=v(t)i(t)=${n(instant.power)}\;\mathrm W`;
    }
  }
  return (
    <Panel
      title="Make a discovery"
      eyebrow="GUIDED EXPLORATION"
      className="challenge-panel"
      actions={<Target size={21} />}
    >
      <div className="challenge-layout">
        <div>
          <label className="field-label" htmlFor={`challenge-${lab}`}>
            Choose your challenge
          </label>
          <select
            id={`challenge-${lab}`}
            value={index}
            onChange={(e) => {
              setIndex(Number(e.target.value));
              setChecked(false);
              setAnswer('');
              setHint(false);
            }}
          >
            {tasks[lab].map((t, k) => (
              <option key={t.title} value={k}>
                {t.title}
              </option>
            ))}
          </select>
          <h4>{task.title}</h4>
          <p>{task.objective}</p>
          {lab === 'power' && index === 0 && (
            <button
              className="text-button"
              onClick={() => {
                onPrepare();
                setChecked(false);
              }}
            >
              Set up series compensation <ArrowUpRight size={14} />
            </button>
          )}
        </div>
        <div className="challenge-workspace">
          {task.kind === 'number' && (
            <label className="answer-field">
              Your calculation{' '}
              <div>
                <input
                  aria-label="Challenge answer"
                  type="number"
                  step="any"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setChecked(false);
                  }}
                />
                <span>{task.unit}</span>
              </div>
            </label>
          )}
          {task.kind === 'concept' && (
            <select
              aria-label="Challenge answer"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setChecked(false);
              }}
            >
              <option value="">Choose a prediction</option>
              {lab === 'reactance' && index === 4 ? (
                <>
                  <option value="increases">Increases</option>
                  <option value="decreases">Decreases</option>
                  <option value="unchanged">Stays the same</option>
                </>
              ) : (
                <>
                  <option value="leading">Current leads voltage</option>
                  <option value="lagging">Current lags voltage</option>
                  <option value="in phase">Current is in phase</option>
                </>
              )}
            </select>
          )}
          <div className="challenge-feedback">
            <span className="field-label">Live experimental feedback</span>
            <p>{feedback}</p>
          </div>
          <div className="challenge-actions">
            <button className="primary-button" onClick={() => setChecked(true)}>
              <Check size={15} />
              Check my experiment
            </button>
            <button
              className="icon-button"
              title="Reset challenge answer"
              aria-label="Reset challenge answer"
              onClick={() => {
                setAnswer('');
                setChecked(false);
                setHint(false);
              }}
            >
              <RotateCcw size={15} />
            </button>
            <button className="text-button" onClick={() => setHint(!hint)}>
              <Lightbulb size={15} />
              {hint ? 'Hide hint' : 'Hint'}
            </button>
          </div>
          {hint && <p className="hint">{task.hint}</p>}
          {checked && (
            <div
              role="status"
              aria-label="Challenge result"
              className={`challenge-result ${success ? 'success' : ''}`}
            >
              <b>
                {success
                  ? 'Well observed. Your experiment meets the target.'
                  : 'Keep exploring. The target has not been reached.'}
              </b>
              <p>{solution}</p>
              {solutionTex && <Equation block tex={solutionTex} />}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
