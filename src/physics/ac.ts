/** All calculations use SI units. Source voltage is the sine-phase reference. */
export const TAU = 2 * Math.PI;
export const SQRT2 = Math.SQRT2;
export type CircuitMode = 'R' | 'L' | 'C' | 'RL' | 'RC' | 'RLC';
export interface CircuitInput {
  mode: CircuitMode;
  voltageRms: number;
  frequency: number;
  resistance: number;
  inductance: number;
  capacitance: number;
}
export interface CircuitSolution extends CircuitInput {
  r: number;
  xl: number;
  xc: number;
  x: number;
  z: number;
  omega: number;
  period: number;
  phase: number;
  phaseDegrees: number;
  voltagePeak: number;
  currentRms: number;
  currentPeak: number;
  vr: number;
  vl: number;
  vc: number;
  pf: number;
  averagePower: number;
  apparentPower: number;
  reactivePower: number;
  resonanceFrequency: number | null;
  character: 'in phase' | 'leading' | 'lagging';
}
export const hasR = (mode: CircuitMode) => mode.includes('R');
export const hasL = (mode: CircuitMode) => mode.includes('L');
export const hasC = (mode: CircuitMode) => mode.includes('C');

function positive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be finite and positive.`);
}
export function rms(peak: number) {
  if (!Number.isFinite(peak) || peak < 0)
    throw new RangeError('Peak must be finite and nonnegative.');
  return peak / SQRT2;
}
export function resonanceFrequency(inductance: number, capacitance: number) {
  positive(inductance, 'Inductance');
  positive(capacitance, 'Capacitance');
  const result = 1 / (TAU * Math.sqrt(inductance) * Math.sqrt(capacitance));
  positive(result, 'Resonance frequency');
  return result;
}
export function solveCircuit(input: CircuitInput): CircuitSolution {
  if (!['R', 'L', 'C', 'RL', 'RC', 'RLC'].includes(input.mode))
    throw new RangeError('Unknown circuit configuration.');
  positive(input.frequency, 'Frequency');
  if (!Number.isFinite(input.voltageRms) || input.voltageRms < 0)
    throw new RangeError('RMS voltage must be finite and nonnegative.');
  if (hasR(input.mode)) positive(input.resistance, 'Resistance');
  if (hasL(input.mode)) positive(input.inductance, 'Inductance');
  if (hasC(input.mode)) positive(input.capacitance, 'Capacitance');
  const omega = TAU * input.frequency;
  const r = hasR(input.mode) ? input.resistance : 0;
  const xl = hasL(input.mode) ? omega * input.inductance : 0;
  const xc = hasC(input.mode) ? 1 / (omega * input.capacitance) : 0;
  // Remove cancellation noise at analytical resonance, never clamp current.
  const rawX = xl - xc;
  const x = Math.abs(rawX) <= Math.max(xl, xc) * 1e-12 ? 0 : rawX;
  const z = Math.hypot(r, x);
  positive(z, 'Impedance');
  const phase = Math.atan2(x, r);
  const currentRms = input.voltageRms / z;
  const pf = r / z;
  const apparentPower = input.voltageRms * currentRms;
  const result: CircuitSolution = {
    ...input,
    r,
    xl,
    xc,
    x,
    z,
    omega,
    period: 1 / input.frequency,
    phase,
    phaseDegrees: (phase * 180) / Math.PI,
    voltagePeak: input.voltageRms * SQRT2,
    currentRms,
    currentPeak: currentRms * SQRT2,
    vr: currentRms * r,
    vl: currentRms * xl,
    vc: currentRms * xc,
    pf,
    averagePower: currentRms ** 2 * r,
    apparentPower,
    reactivePower: apparentPower * Math.sin(phase),
    resonanceFrequency:
      hasL(input.mode) && hasC(input.mode)
        ? resonanceFrequency(input.inductance, input.capacitance)
        : null,
    character: x === 0 ? 'in phase' : x > 0 ? 'lagging' : 'leading',
  };
  for (const value of Object.values(result)) {
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new RangeError('Parameters exceed the finite steady-state model.');
  }
  return result;
}
export function atPhase(s: CircuitSolution, theta: number) {
  if (!Number.isFinite(theta)) throw new RangeError('Phase must be finite.');
  const alpha = theta - s.phase;
  const voltage = s.voltagePeak * Math.sin(theta);
  const current = s.currentPeak * Math.sin(alpha);
  return {
    voltage,
    current,
    power: voltage * current,
    vr: s.currentPeak * s.r * Math.sin(alpha),
    vl: s.currentPeak * s.xl * Math.sin(alpha + Math.PI / 2),
    vc: s.currentPeak * s.xc * Math.sin(alpha - Math.PI / 2),
    time: theta / s.omega,
  };
}
export function cycleMean(fn: (theta: number) => number, count = 2048) {
  if (!Number.isInteger(count) || count < 4)
    throw new RangeError('At least four samples are required.');
  let sum = 0;
  for (let k = 0; k < count; k++) sum += fn((TAU * k) / count);
  return sum / count;
}
export function rmsExperiment(peak: number, resistance: number, dcVoltage: number) {
  positive(resistance, 'Resistance');
  if (!Number.isFinite(dcVoltage) || dcVoltage < 0)
    throw new RangeError('DC voltage must be finite and nonnegative.');
  const voltageRms = rms(peak);
  const acPower = voltageRms ** 2 / resistance;
  const dcPower = dcVoltage ** 2 / resistance;
  const difference = dcPower - acPower;
  const relativeError = acPower > 0 ? Math.abs(difference) / acPower : null;
  return {
    voltageRms,
    currentRms: voltageRms / resistance,
    acPower,
    dcPower,
    difference,
    relativeError,
    // A fixed wattage floor would falsely report a 1% match at small powers.
    matched: Math.abs(difference) <= 0.01 * acPower * (1 + 1e-12),
  };
}
export function resonanceStatus(s: CircuitSolution) {
  if (s.resonanceFrequency === null) return null;
  const mismatch = Math.abs(s.xl - s.xc) / Math.max(s.xl, s.xc);
  return mismatch <= 0.001
    ? 'At resonance'
    : mismatch <= 0.05
      ? 'Near resonance'
      : s.x > 0
        ? 'Inductive'
        : 'Capacitive';
}
export function advancePhase(theta: number, elapsed: number, speed: number) {
  if (![theta, elapsed, speed].every(Number.isFinite) || elapsed < 0 || speed < 0)
    throw new RangeError('Invalid clock input.');
  // One visual cycle per 8 s at 1×. Physical time is always theta / omega.
  const increment = elapsed * (TAU / 8) * speed;
  if (!Number.isFinite(increment)) throw new RangeError('Clock step exceeds the finite model.');
  const phase = ((theta % TAU) + (increment % TAU)) % TAU;
  return phase < 0 ? phase + TAU : phase === 0 ? 0 : phase;
}
export function frequencySweep(input: CircuitInput, low: number, high: number, count = 240) {
  positive(low, 'Lower frequency');
  positive(high, 'Upper frequency');
  if (high <= low || !Number.isInteger(count) || count < 2)
    throw new RangeError(
      'A sweep requires increasing positive bounds and an integer sample count of at least two.',
    );
  const logLow = Math.log(low),
    logSpan = Math.log(high) - logLow;
  return Array.from({ length: count }, (_, k) =>
    solveCircuit({
      ...input,
      frequency:
        k === 0 ? low : k === count - 1 ? high : Math.exp(logLow + (logSpan * k) / (count - 1)),
    }),
  );
}
/** Resolve narrow resonance peaks without distorting the logarithmic frequency axis. */
export function resonanceSweep(input: CircuitInput, low: number, high: number) {
  const solution = solveCircuit(input);
  if (solution.resonanceFrequency === null)
    throw new RangeError('Resonance requires both L and C.');
  const f0 = solution.resonanceFrequency;
  const bandwidth = solution.r / (TAU * input.inductance);
  const frequencies = new Set(
    frequencySweep(input, low, high, 241).map((sample) => sample.frequency),
  );
  for (const frequency of [
    f0,
    input.frequency,
    ...Array.from({ length: 61 }, (_, k) => f0 + ((k - 30) * bandwidth) / 10),
  ]) {
    if (frequency >= low && frequency <= high) frequencies.add(frequency);
  }
  return [...frequencies]
    .sort((a, b) => a - b)
    .map((frequency) => solveCircuit({ ...input, frequency }));
}
export function format(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1e-14) return (0).toFixed(digits);
  if (Math.abs(value) >= 1e6 || Math.abs(value) < 0.001) {
    const [mantissa, exponent] = value.toExponential(2).split('e');
    const superscripts: Record<string, string> = {
      '-': '⁻',
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
    };
    return `${mantissa}×10${String(Number(exponent)).replace(/[-\d]/g, (digit) => superscripts[digit])}`;
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
export function currentLabel(value: number) {
  const reading = engineeringValue(value, 'A', Math.abs(value) < 0.1 ? 1 : 3, 0.1);
  return `${reading.value} ${reading.unit}`;
}
/** Compact SI prefixes for meters; the model and exported data remain in base units. */
export function engineeringValue(value: number, unit: string, digits = 2, smallThreshold = 1) {
  if (!Number.isFinite(value)) throw new RangeError('A meter value must be finite.');
  const magnitude = Math.abs(value);
  const factors: [[number, string], ...Array<[number, string]>] = [
    [1e9, 'G'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];
  for (const [factor, prefix] of factors)
    if (magnitude >= factor) return { value: format(value / factor, digits), unit: prefix + unit };
  if (magnitude > 0 && magnitude < smallThreshold) {
    const factor =
      magnitude >= 1e-3 ? 1e-3 : magnitude >= 1e-6 ? 1e-6 : magnitude >= 1e-9 ? 1e-9 : 1e-12;
    const prefix = factor === 1e-3 ? 'm' : factor === 1e-6 ? 'µ' : factor === 1e-9 ? 'n' : 'p';
    return { value: format(value / factor, digits), unit: prefix + unit };
  }
  return { value: format(value, digits), unit };
}
