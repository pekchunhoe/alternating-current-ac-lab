import { readFile, writeFile } from 'node:fs/promises';
import { atPhase, cycleMean, solveCircuit, rmsExperiment } from '../src/physics/ac.ts';
const independent = JSON.parse(
  await readFile(new URL('../audit/independent-reference.json', import.meta.url), 'utf8'),
);
const fields = {
  z: 'impedance_ohm',
  phaseDegrees: 'phase_degrees',
  currentRms: 'current_rms_A',
  pf: 'power_factor',
  averagePower: 'average_power_W',
  vr: 'vr_rms_V',
  vl: 'vl_rms_V',
  vc: 'vc_rms_V',
};
const results = [];
for (const item of independent.cases) {
  const solution = solveCircuit(item.input),
    differences = {};
  for (const [field, reference] of Object.entries(fields)) {
    const difference = Math.abs(solution[field] - item.reference[reference]);
    if (difference > 1e-10 * Math.max(1, Math.abs(item.reference[reference])))
      throw new Error(`${item.input.name}: ${field} disagrees with independent Python reference`);
    differences[field] = difference;
  }
  const maxKvlError = Math.max(
    ...Array.from({ length: 1024 }, (_, k) => {
      const v = atPhase(solution, (k * 2 * Math.PI) / 1024);
      return Math.abs(v.voltage - v.vr - v.vl - v.vc);
    }),
  );
  results.push({
    name: item.input.name,
    input: item.input,
    application: {
      impedance_ohm: solution.z,
      phase_degrees: solution.phaseDegrees,
      current_rms_A: solution.currentRms,
      power_factor: solution.pf,
      average_power_W: solution.averagePower,
      vr_rms_V: solution.vr,
      vl_rms_V: solution.vl,
      vc_rms_V: solution.vc,
      numerical_average_power_W: cycleMean((t) => atPhase(solution, t).power, 8192),
      maximum_kvl_error_V: maxKvlError,
    },
    absolute_differences_from_independent_reference: differences,
  });
}
const report = {
  generated_at_utc: new Date().toISOString(),
  client_timezone: 'Asia/Kuala_Lumpur',
  independent_method: independent.method,
  cases_compared: results.length,
  all_reference_comparisons_passed: true,
  normal_rms_heating: rmsExperiment(10, 10, 10 / Math.sqrt(2)),
  low_power_mismatch: rmsExperiment(1, 200, Math.sqrt(0.6)),
  cases: results,
};
await writeFile(
  new URL('../audit/physics-evidence.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    cases_compared: results.length,
    all_reference_comparisons_passed: true,
    maximum_kvl_error_V: Math.max(...results.map((r) => r.application.maximum_kvl_error_V)),
  }),
);
