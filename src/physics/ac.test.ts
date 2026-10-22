import { describe, expect, it } from 'vitest';
import {
  advancePhase,
  atPhase,
  cycleMean,
  frequencySweep,
  resonanceFrequency,
  resonanceStatus,
  resonanceSweep,
  rms,
  rmsExperiment,
  solveCircuit,
  TAU,
} from './ac';
import type { CircuitInput, CircuitMode } from './ac';
const base: CircuitInput = {
  mode: 'RLC',
  voltageRms: 12,
  frequency: 50,
  resistance: 20,
  inductance: 0.1,
  capacitance: 100e-6,
};
describe('Sinusoidal signals and RMS heating', () => {
  it('matches RMS and quarter-cycle values; complete-cycle mean is zero', () => {
    expect(rms(10)).toBeCloseTo(7.071067812, 8);
    const s = solveCircuit({ ...base, mode: 'R', voltageRms: rms(10), resistance: 10 });
    [0, 10, 0, -10, 0].forEach((v, k) =>
      expect(atPhase(s, (k * Math.PI) / 2).voltage).toBeCloseTo(v, 10),
    );
    expect(cycleMean((theta) => atPhase(s, theta).voltage)).toBeCloseTo(0, 12);
    expect(Math.sqrt(cycleMean((theta) => atPhase(s, theta).voltage ** 2))).toBeCloseTo(
      rms(10),
      10,
    );
  });
  it('produces 5 W and the correct equivalent DC voltage', () => {
    const h = rmsExperiment(10, 10, rms(10));
    expect(h.acPower).toBeCloseTo(5, 12);
    expect(h.dcPower).toBeCloseTo(5, 12);
    expect(h.matched).toBe(true);
    expect(rmsExperiment(10, 10, 10).matched).toBe(false);
  });
});
describe('Impedance and signed phase', () => {
  it.each<[CircuitMode, number]>([
    ['R', 0],
    ['L', 90],
    ['C', -90],
  ])('%s phase equals %s degrees', (mode, phase) => {
    expect(
      solveCircuit({ ...base, mode, resistance: mode === 'R' ? 20 : 0 }).phaseDegrees,
    ).toBeCloseTo(phase, 10);
  });
  it('reactance has correct frequency dependence', () => {
    const a = solveCircuit(base),
      b = solveCircuit({ ...base, frequency: 100 });
    expect(b.xl).toBeCloseTo(a.xl * 2, 10);
    expect(b.xc).toBeCloseTo(a.xc / 2, 10);
    expect(solveCircuit({ ...base, mode: 'RL' }).phase).toBeGreaterThan(0);
    expect(solveCircuit({ ...base, mode: 'RC' }).phase).toBeLessThan(0);
  });
  it('reproduces the 30 + j40 ohm RL reference', () => {
    const s = solveCircuit({
      ...base,
      mode: 'RL',
      resistance: 30,
      inductance: 40 / (TAU * 50),
      voltageRms: 100,
    });
    expect(s.z).toBeCloseTo(50, 10);
    expect(s.phaseDegrees).toBeCloseTo(53.130102, 5);
    expect(s.currentRms).toBeCloseTo(2, 12);
    expect(s.averagePower).toBeCloseTo(120, 10);
    expect(s.pf).toBeCloseTo(0.6, 12);
  });
  it('resonates at 50.3292 Hz without limiting component voltages', () => {
    const f = resonanceFrequency(0.1, 100e-6);
    expect(f).toBeCloseTo(50.329212, 5);
    const s = solveCircuit({ ...base, frequency: f });
    expect(s.z).toBeCloseTo(20, 10);
    expect(s.currentRms).toBeCloseTo(0.6, 10);
    expect(s.averagePower).toBeCloseTo(7.2, 10);
    expect(s.phase).toBe(0);
    expect(s.pf).toBe(1);
    expect(s.vl).toBeCloseTo(s.vc, 10);
    expect(s.vl).toBeGreaterThan(s.voltageRms);
    expect(resonanceStatus(s)).toBe('At resonance');
    expect(solveCircuit({ ...base, frequency: f * 0.9 }).phase).toBeLessThan(0);
    expect(solveCircuit({ ...base, frequency: f * 1.1 }).phase).toBeGreaterThan(0);
    expect(resonanceStatus(solveCircuit({ ...base, mode: 'RC' }))).toBeNull();
  });
});
describe('Kirchhoff voltage and energy invariants', () => {
  it.each<CircuitMode>(['R', 'C', 'L', 'RL', 'RC', 'RLC'])(
    '%s satisfies KVL and power integration',
    (mode) => {
      const s = solveCircuit({ ...base, mode, frequency: 73 });
      for (let k = 0; k < 257; k++) {
        const v = atPhase(s, (k * TAU) / 257);
        expect(v.voltage).toBeCloseTo(v.vr + v.vl + v.vc, 9);
      }
      expect(s.averagePower).toBeCloseTo(s.voltageRms * s.currentRms * Math.cos(s.phase), 10);
      expect(cycleMean((theta) => atPhase(s, theta).power)).toBeCloseTo(s.averagePower, 10);
      if (mode === 'L' || mode === 'C') {
        expect(s.averagePower).toBe(0);
        const p = Array.from({ length: 100 }, (_, k) => atPhase(s, (k * TAU) / 100).power);
        expect(Math.min(...p)).toBeLessThan(0);
        expect(Math.max(...p)).toBeGreaterThan(0);
      }
      if (mode === 'R')
        for (let k = 0; k < 100; k++)
          expect(atPhase(s, (k * TAU) / 100).power).toBeGreaterThanOrEqual(0);
    },
  );
});
describe('Robustness and playback', () => {
  it('resolves a narrow high-Q peak at its exact frequency and includes the operating marker', () => {
    const input = { ...base, resistance: 1, inductance: 2, capacitance: 1e-6, frequency: 80 };
    const f0 = resonanceFrequency(input.inductance, input.capacitance);
    const sweep = resonanceSweep(input, 1, 1000);
    expect(sweep.some((sample) => sample.frequency === f0)).toBe(true);
    expect(sweep.some((sample) => sample.frequency === 80)).toBe(true);
    expect(Math.max(...sweep.map((sample) => sample.currentRms))).toBeCloseTo(12, 10);
    const peak = sweep.find((sample) => sample.frequency === f0)!;
    expect(peak.z).toBe(1);
    for (let k = 1; k < sweep.length; k++)
      expect(sweep[k].frequency).toBeGreaterThan(sweep[k - 1].frequency);
  });
  it.each([0.0001, 1, 50, 1e6])('finite results at %s Hz', (frequency) => {
    for (const inductance of [1e-8, 10])
      for (const capacitance of [1e-12, 10]) {
        const s = solveCircuit({ ...base, frequency, inductance, capacitance });
        Object.values(s)
          .filter((v) => typeof v === 'number')
          .forEach((v) => expect(Number.isFinite(v)).toBe(true));
      }
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid frequency %s', (frequency) =>
    expect(() => solveCircuit({ ...base, frequency })).toThrow(RangeError),
  );
  it('rejects undefined zero-impedance and invalid component states', () => {
    expect(() => solveCircuit({ ...base, resistance: 0 })).toThrow();
    expect(() => solveCircuit({ ...base, capacitance: 0 })).toThrow();
    expect(() => solveCircuit({ ...base, inductance: NaN })).toThrow();
    expect(() => rms(-1)).toThrow();
    expect(() => atPhase(solveCircuit(base), NaN)).toThrow();
  });
  it('supports tiny clock steps, repeated wrapping and pause', () => {
    expect(advancePhase(1, 1e-12, 1)).toBeGreaterThan(1);
    expect(advancePhase(1, 1, 0)).toBe(1);
    let theta = 0;
    for (let k = 0; k < 10000; k++) theta = advancePhase(theta, 0.02, 0.25);
    expect(theta).toBeGreaterThanOrEqual(0);
    expect(theta).toBeLessThan(TAU);
    expect(advancePhase(0, 8, 1)).toBeCloseTo(0, 12);
  });
  it('samples analytical frequency response and handles rapid parameter changes', () => {
    const sweep = frequencySweep(base, 10, 500);
    expect(sweep).toHaveLength(240);
    expect(sweep[0].frequency).toBeCloseTo(10);
    expect(sweep[239].frequency).toBeCloseTo(500);
    for (let k = 1; k < 400; k++)
      expect(solveCircuit({ ...base, frequency: k }).currentRms).toBeGreaterThan(0);
  });
});
