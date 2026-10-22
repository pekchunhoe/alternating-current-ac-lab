import { describe, expect, it } from 'vitest';
import {
  advancePhase,
  atPhase,
  cycleMean,
  currentLabel,
  engineeringValue,
  format,
  frequencySweep,
  resonanceFrequency,
  resonanceSweep,
  rmsExperiment,
  solveCircuit,
  TAU,
} from './ac';
import type { CircuitInput, CircuitMode } from './ac';
import { texNumber } from './notation';
const input: CircuitInput = {
  mode: 'RLC',
  frequency: 50,
  voltageRms: 12,
  resistance: 20,
  inductance: 0.1,
  capacitance: 100e-6,
};
const modes: CircuitMode[] = ['R', 'L', 'C', 'RL', 'RC', 'RLC'];
function relative(actual: number, expected: number, scale = 1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    2e-10 * Math.max(scale, Math.abs(expected)),
  );
}
describe('Curriculum audit: frequency, phase and RMS', () => {
  it('keeps resistance fixed, inductance proportional and capacitance inversely proportional to frequency', () => {
    for (const mode of modes) {
      const a = solveCircuit({ ...input, mode, frequency: 25 }),
        b = solveCircuit({ ...input, mode, frequency: 100 });
      expect(b.r).toBe(a.r);
      relative(b.xl, 4 * a.xl);
      relative(b.xc, a.xc / 4);
      if (mode === 'R') relative(b.currentRms, a.currentRms);
      if (mode === 'L') {
        relative(b.currentRms, a.currentRms / 4);
        expect(b.phaseDegrees).toBe(90);
      }
      if (mode === 'C') {
        relative(b.currentRms, a.currentRms * 4);
        expect(b.phaseDegrees).toBe(-90);
      }
      if (mode === 'RL') expect(b.z).toBeGreaterThan(a.z);
      if (mode === 'RC') expect(b.z).toBeLessThan(a.z);
    }
  });
  it.each(modes)(
    '%s numerical RMS, mean and instantaneous power agree with the analytical model',
    (mode) => {
      const s = solveCircuit({ ...input, mode });
      relative(
        cycleMean((t) => atPhase(s, t).current),
        0,
      );
      relative(Math.sqrt(cycleMean((t) => atPhase(s, t).current ** 2)), s.currentRms);
      relative(Math.sqrt(cycleMean((t) => atPhase(s, t).voltage ** 2)), s.voltageRms);
      for (let k = 0; k < 37; k++) {
        const theta = (k * TAU) / 37,
          v = atPhase(s, theta);
        relative(v.power, s.averagePower - s.apparentPower * Math.cos(2 * theta - s.phase));
        relative(v.power, v.current * (v.vr + v.vl + v.vc));
      }
      relative(
        cycleMean((t) => atPhase(s, t).current * atPhase(s, t).vr),
        s.averagePower,
      );
      relative(
        cycleMean((t) => atPhase(s, t).current * atPhase(s, t).vl),
        0,
      );
      relative(
        cycleMean((t) => atPhase(s, t).current * atPhase(s, t).vc),
        0,
      );
      relative(s.averagePower ** 2 + s.reactivePower ** 2, s.apparentPower ** 2);
    },
  );
  it('fixes quadrature polarity at a rising voltage zero crossing', () => {
    const l = solveCircuit({ ...input, mode: 'L' }),
      c = solveCircuit({ ...input, mode: 'C' });
    relative(atPhase(l, 0).current, -l.currentPeak);
    relative(atPhase(c, 0).current, c.currentPeak);
    relative(atPhase(l, Math.PI / 2).current, 0);
    relative(atPhase(c, Math.PI / 2).current, 0);
  });
  it('shifts resonance with L and C and keeps series RLC impedance minimal there', () => {
    const f0 = resonanceFrequency(0.1, 100e-6);
    relative(resonanceFrequency(0.4, 100e-6), f0 / 2);
    relative(resonanceFrequency(0.1, 400e-6), f0 / 2);
    for (const factor of [0.1, 0.5, 0.999, 1.001, 2, 10]) {
      const s = solveCircuit({ ...input, frequency: f0 * factor });
      expect(s.z).toBeGreaterThan(input.resistance);
      expect(Math.sign(s.phase)).toBe(factor < 1 ? -1 : 1);
    }
    for (const mode of ['R', 'RL', 'RC', 'L', 'C'] as CircuitMode[])
      expect(solveCircuit({ ...input, mode }).resonanceFrequency).toBeNull();
  });
  it('enforces the stated 1% heating tolerance at milliwatt powers', () => {
    const match = rmsExperiment(1, 200, 1 / Math.sqrt(2));
    expect(match.acPower).toBeCloseTo(0.0025, 12);
    expect(match.matched).toBe(true);
    const wrong = rmsExperiment(1, 200, Math.sqrt(0.003 * 200));
    expect(wrong.relativeError).toBeCloseTo(0.2, 12);
    expect(wrong.matched).toBe(false);
    expect(rmsExperiment(1, 200, Math.sqrt(0.0025 * 1.01 * 200)).matched).toBe(true);
    expect(rmsExperiment(1, 200, Math.sqrt(0.0025 * 1.0101 * 200)).matched).toBe(false);
    expect(rmsExperiment(0, 20, 1).relativeError).toBeNull();
    expect(rmsExperiment(0, 20, 1).matched).toBe(false);
    expect(rmsExperiment(0, 20, 0).matched).toBe(true);
  });
});
describe('Curriculum audit: robustness and numerical limits', () => {
  it.each(modes)(
    '%s satisfies Kirchhoff and power invariants at every UI parameter corner',
    (mode) => {
      for (const frequency of [1, 10000])
        for (const resistance of [1, 200])
          for (const inductance of [0.001, 2])
            for (const capacitance of [1e-6, 0.002])
              for (const voltageRms of [1, 100]) {
                const s = solveCircuit({
                  mode,
                  frequency,
                  resistance,
                  inductance,
                  capacitance,
                  voltageRms,
                });
                for (let k = 0; k < 19; k++) {
                  const v = atPhase(s, (k * TAU) / 19);
                  relative(v.vr + v.vl + v.vc, v.voltage, s.voltagePeak);
                  relative(v.power, v.voltage * v.current);
                }
                relative(s.averagePower, s.currentRms ** 2 * s.r);
                relative(s.pf, Math.cos(s.phase));
                expect(s.pf).toBeGreaterThanOrEqual(0);
                expect(s.pf).toBeLessThanOrEqual(1);
                expect(
                  Object.values(s)
                    .filter((v) => typeof v === 'number')
                    .every(Number.isFinite),
                ).toBe(true);
              }
    },
  );
  it('rejects nonfinite and noninteger sampling counts instead of returning a broken sweep', () => {
    for (const count of [0, 1, 2.5, NaN, Infinity])
      expect(() => frequencySweep(input, 1, 100, count)).toThrow(RangeError);
    expect(() => frequencySweep(input, 100, 1)).toThrow(RangeError);
    expect(() => resonanceSweep({ ...input, mode: 'RC' }, 1, 100)).toThrow(RangeError);
  });
  it('samples a wide finite frequency interval without overflowing a frequency ratio', () => {
    const samples = frequencySweep(input, 1e-100, 1e100, 5);
    expect(samples[0].frequency).toBe(1e-100);
    expect(samples[4].frequency).toBe(1e100);
    expect(samples.every((s) => Number.isFinite(s.z))).toBe(true);
  });
  it('normalizes negative phase, preserves pause, and rejects overflowing clock steps', () => {
    relative(advancePhase(-Math.PI / 2, 0, 0), Math.PI * 1.5);
    expect(advancePhase(1, Number.MAX_VALUE, 0)).toBe(1);
    expect(() => advancePhase(1, Number.MAX_VALUE, Number.MAX_VALUE)).toThrow(RangeError);
    expect(() => advancePhase(0, -1, 1)).toThrow(RangeError);
    expect(() => advancePhase(0, 1, NaN)).toThrow(RangeError);
  });
  it('typesets small, large and signed numbers as powers of ten with preserved value', () => {
    for (const value of [1.234567e-8, -7.891234e-7, 1.234567e25, -1.234567e25, 0.5, 120]) {
      const tex = texNumber(value),
        match = tex.match(/^(.+)\\times10\^\{(-?\d+)\}$/);
      const decoded = match ? Number(match[1]) * 10 ** Number(match[2]) : Number(tex);
      expect(Math.abs(decoded / value - 1)).toBeLessThan(0.00005);
      expect(tex).not.toMatch(/\de[+-]?\d/);
    }
    expect(() => texNumber(NaN)).toThrow(RangeError);
  });
  it('uses readable engineering units at extreme meter values without changing their magnitude', () => {
    expect(engineeringValue(159154.943, 'Ω')).toEqual({ value: '159.15', unit: 'kΩ' });
    expect(engineeringValue(0.006283, 'Ω')).toEqual({ value: '6.28', unit: 'mΩ' });
    expect(engineeringValue(12566.3706, 'A', 3, 0.001)).toEqual({ value: '12.566', unit: 'kA' });
    expect(engineeringValue(7.957747e-6, 'A', 3, 0.001)).toEqual({ value: '7.958', unit: 'µA' });
    expect(engineeringValue(0.6, 'A', 3, 0.001)).toEqual({ value: '0.600', unit: 'A' });
    expect(currentLabel(-4.3424e-9)).toBe('-4.3 nA');
    expect(currentLabel(7.9577e-6)).toBe('8.0 µA');
    expect(currentLabel(0.0334)).toBe('33.4 mA');
    expect(format(6.3326e-11, 3)).toBe('6.33×10⁻¹¹');
    expect(format(-7.9e-9, 3)).toBe('-7.90×10⁻⁹');
    expect(engineeringValue(0.0025, 'W')).toEqual({ value: '2.50', unit: 'mW' });
  });
});
