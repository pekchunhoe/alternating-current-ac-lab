import type { CircuitMode, CircuitInput } from './physics/ac';
import { resonanceFrequency, SQRT2 } from './physics/ac';
export type LabId = 'waveforms' | 'rms' | 'reactance' | 'power';
export const MAX_UI_FREQUENCY = 10000;
export interface Experiment {
  mode: CircuitMode;
  peakVoltage: number;
  voltageRms: number;
  peakCurrent: number;
  signalMode: boolean;
  frequency: number;
  resistance: number;
  inductance: number;
  capacitance: number;
  dcVoltage: number;
  windowMs: number;
}
export const labNames: Record<LabId, string> = {
  waveforms: 'AC Waveforms',
  rms: 'RMS Values',
  reactance: 'Reactance & Impedance',
  power: 'Power & Power Factor',
};
export const defaults: Record<LabId, Experiment> = {
  waveforms: {
    mode: 'R',
    peakVoltage: 12,
    voltageRms: 12 / SQRT2,
    peakCurrent: 0.24,
    signalMode: false,
    frequency: 50,
    resistance: 50,
    inductance: 0.1,
    capacitance: 100e-6,
    dcVoltage: 6,
    windowMs: 40,
  },
  rms: {
    mode: 'R',
    peakVoltage: 10,
    voltageRms: 10 / SQRT2,
    peakCurrent: 1,
    signalMode: false,
    frequency: 50,
    resistance: 10,
    inductance: 0.1,
    capacitance: 100e-6,
    dcVoltage: 5,
    windowMs: 40,
  },
  reactance: {
    mode: 'RLC',
    peakVoltage: 12 * SQRT2,
    voltageRms: 12,
    peakCurrent: 1,
    signalMode: false,
    frequency: 35,
    resistance: 20,
    inductance: 0.1,
    capacitance: 100e-6,
    dcVoltage: 5,
    windowMs: 60,
  },
  power: {
    mode: 'RL',
    peakVoltage: 12 * SQRT2,
    voltageRms: 12,
    peakCurrent: 1,
    signalMode: false,
    frequency: 50,
    resistance: 20,
    inductance: 0.1,
    capacitance: 100e-6,
    dcVoltage: 5,
    windowMs: 40,
  },
};
export function circuitInput(p: Experiment, lab: LabId): CircuitInput {
  return {
    ...p,
    mode: lab === 'waveforms' || lab === 'rms' ? 'R' : p.mode,
    voltageRms: lab === 'waveforms' || lab === 'rms' ? p.peakVoltage / SQRT2 : p.voltageRms,
  };
}
export const presetNames = [
  'Purely Resistive',
  'Current Leads',
  'Current Lags',
  'Capacitive Dominance',
  'Inductive Dominance',
  'Near Resonance',
  'Exact Resonance',
  'Equal Heating',
] as const;
export type Preset = (typeof presetNames)[number];
export function applyPreset(p: Experiment, name: Preset): Experiment {
  const standard = {
    ...p,
    signalMode: false,
    resistance: 20,
    inductance: 0.1,
    capacitance: 100e-6,
    voltageRms: 12,
  };
  switch (name) {
    case 'Purely Resistive':
      return { ...standard, mode: 'R', frequency: 50 };
    case 'Current Leads':
      return { ...standard, mode: 'RC', frequency: 50 };
    case 'Current Lags':
      return { ...standard, mode: 'RL', frequency: 50 };
    case 'Capacitive Dominance':
      return { ...standard, mode: 'RLC', frequency: 30 };
    case 'Inductive Dominance':
      return { ...standard, mode: 'RLC', frequency: 90 };
    case 'Near Resonance':
      return { ...standard, mode: 'RLC', frequency: resonanceFrequency(0.1, 100e-6) * 1.015 };
    case 'Exact Resonance':
      return { ...standard, mode: 'RLC', frequency: resonanceFrequency(0.1, 100e-6) };
    case 'Equal Heating':
      return { ...p, dcVoltage: p.peakVoltage / SQRT2 };
  }
}
