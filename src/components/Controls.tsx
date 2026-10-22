import { SlidersHorizontal, Sparkles } from 'lucide-react';
import type { Experiment, LabId, Preset } from '../model';
import { applyPreset, presetNames, MAX_UI_FREQUENCY } from '../model';
import type { CircuitMode } from '../physics/ac';
import { hasC, hasL, hasR } from '../physics/ac';
import { Note, Panel, Parameter, ResetButton } from './UI';
export function Controls({
  lab,
  p,
  onChange,
  onReset,
}: {
  lab: LabId;
  p: Experiment;
  onChange: (p: Experiment) => void;
  onReset: () => void;
}) {
  const set = (key: keyof Experiment, value: number | boolean | CircuitMode) =>
    onChange({ ...p, [key]: value });
  const circuit = lab === 'reactance' || lab === 'power';
  const presets = circuit
    ? presetNames.filter((n) => n !== 'Equal Heating')
    : lab === 'rms'
      ? ['Equal Heating']
      : ['50 Hz supply', 'Slow oscillation', 'Higher frequency'];
  return (
    <aside className="controls-column">
      <Panel
        title="Experiment setup"
        actions={<SlidersHorizontal size={16} />}
        className="controls-panel"
      >
        {circuit && (
          <div className="control-section">
            <span className="field-label">Circuit configuration</span>
            <div className="circuit-selector" role="group" aria-label="Circuit configuration">
              {(lab === 'power'
                ? ['R', 'RC', 'RL', 'RLC']
                : ['R', 'C', 'L', 'RL', 'RC', 'RLC']
              ).map((mode) => (
                <button
                  key={mode}
                  aria-pressed={p.mode === mode}
                  className={p.mode === mode ? 'selected' : ''}
                  onClick={() => set('mode', mode as CircuitMode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="caption">Ideal components · steady-state AC</p>
          </div>
        )}
        {lab === 'waveforms' && (
          <div className="control-section">
            <label className="field-label" htmlFor="waveform-model">
              Exploration mode
            </label>
            <select
              id="waveform-model"
              value={p.signalMode ? 'signals' : 'resistor'}
              onChange={(e) => set('signalMode', e.target.value === 'signals')}
            >
              <option value="resistor">Connected resistive circuit</option>
              <option value="signals">Independent signals</option>
            </select>
          </div>
        )}
        <div className="parameters">
          {circuit ? (
            <Parameter
              label="Source RMS voltage"
              symbol="Vᵣₘₛ"
              value={p.voltageRms}
              min={1}
              max={100}
              step={0.5}
              unit="V"
              onChange={(v) => set('voltageRms', v)}
            />
          ) : (
            <Parameter
              label="Peak voltage"
              symbol="V₀"
              value={p.peakVoltage}
              min={1}
              max={100}
              step={0.5}
              unit="V"
              onChange={(v) => set('peakVoltage', v)}
            />
          )}
          <Parameter
            label="Frequency"
            symbol="f"
            value={p.frequency}
            min={1}
            max={MAX_UI_FREQUENCY}
            step={0.1}
            unit="Hz"
            log
            onChange={(v) => set('frequency', v)}
            digits={3}
          />
          {lab === 'waveforms' && p.signalMode ? (
            <Parameter
              label="Peak current"
              symbol="I₀"
              value={p.peakCurrent}
              min={0.01}
              max={5}
              step={0.01}
              unit="A"
              onChange={(v) => set('peakCurrent', v)}
              digits={3}
            />
          ) : (
            (!circuit || hasR(p.mode)) && (
              <Parameter
                label="Resistance"
                symbol="R"
                value={p.resistance}
                min={1}
                max={200}
                step={1}
                unit="Ω"
                onChange={(v) => set('resistance', v)}
              />
            )
          )}
          {circuit && hasL(p.mode) && (
            <Parameter
              label="Inductance"
              symbol="L"
              value={p.inductance * 1000}
              min={1}
              max={2000}
              step={1}
              unit="mH"
              log
              onChange={(v) => set('inductance', v / 1000)}
            />
          )}
          {circuit && hasC(p.mode) && (
            <Parameter
              label="Capacitance"
              symbol="C"
              value={p.capacitance * 1e6}
              min={1}
              max={2000}
              step={0.1}
              unit="µF"
              log
              onChange={(v) => set('capacitance', v / 1e6)}
            />
          )}
          {lab === 'rms' && (
            <Parameter
              label="DC comparison voltage"
              symbol="Vᴅᴄ"
              value={p.dcVoltage}
              min={0}
              max={100}
              step={0.1}
              unit="V"
              onChange={(v) => set('dcVoltage', v)}
              digits={3}
            />
          )}
        </div>
        <div className="preset-section">
          <label htmlFor={`presets-${lab}`} className="field-label">
            <Sparkles size={13} />
            Try an experiment
          </label>
          <select
            id={`presets-${lab}`}
            aria-label="Experiment preset"
            value=""
            onChange={(e) => {
              if (circuit || lab === 'rms') onChange(applyPreset(p, e.target.value as Preset));
              else
                onChange({
                  ...p,
                  frequency:
                    e.target.value === 'Higher frequency'
                      ? 100
                      : e.target.value === 'Slow oscillation'
                        ? 25
                        : 50,
                });
            }}
          >
            <option value="" disabled>
              Choose a preset…
            </option>
            {presets.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <ResetButton onClick={onReset} />
      </Panel>
      <div className="control-note">
        <span className="eyebrow">BENCH NOTES</span>
        <Note>
          {lab === 'waveforms'
            ? p.signalMode
              ? 'Independent-signal mode lets you explore amplitudes without implying a connected physical load.'
              : 'A connected resistor obeys Ohm’s law. Change voltage or resistance to change the current.'
            : lab === 'rms'
              ? 'The two resistors are identical. Match their average powers, rather than their peak voltages.'
              : lab === 'reactance'
                ? 'Voltage is the time reference. A positive phase angle means that current lags; a negative angle means that it leads.'
                : 'Only resistance dissipates average power. Reactance stores energy and returns it to the source.'}
        </Note>
        {lab === 'waveforms' && (
          <Note>
            Alternating current changes magnitude and periodically reverses direction. This lab uses
            a sinusoidal AC source.
          </Note>
        )}
        {lab === 'rms' && (
          <Note>
            RMS current is the DC current that produces the same average heating in an identical
            resistor. RMS voltage is the equivalent DC voltage.
          </Note>
        )}
      </div>
    </aside>
  );
}
