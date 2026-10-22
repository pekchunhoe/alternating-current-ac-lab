"""Independent SI references using Python complex arithmetic and complete-cycle sums."""
from pathlib import Path
import cmath
import json
import math

base = dict(voltageRms=12, frequency=50, resistance=20, inductance=.1, capacitance=100e-6)
cases = [dict(base, mode=mode, name=mode) for mode in ["R", "L", "C", "RL", "RC"]]
cases += [dict(base, mode="RLC", frequency=f, name=f"RLC_{f}Hz") for f in [35, 90]]
cases += [dict(base, mode="RL", resistance=30, inductance=40/(2*math.pi*50), voltageRms=100, name="RL_reference")]
cases += [dict(base, mode="RLC", frequency=1/(2*math.pi*math.sqrt(.1*100e-6)), name="RLC_resonance")]
cases += [dict(base, mode="RLC", resistance=1, inductance=2, capacitance=1e-6, frequency=1/(2*math.pi*math.sqrt(2e-6)), name="RLC_narrow_resonance")]
result = []
count = 8192
for case in cases:
    omega = 2*math.pi*case["frequency"]
    r = case["resistance"] if "R" in case["mode"] else 0
    xl = omega*case["inductance"] if "L" in case["mode"] else 0
    xc = 1/(omega*case["capacitance"]) if "C" in case["mode"] else 0
    impedance = complex(r, xl-xc)
    phase = cmath.phase(impedance)
    current = case["voltageRms"]/abs(impedance)
    v0, i0 = math.sqrt(2)*case["voltageRms"], math.sqrt(2)*current
    samples = []
    for k in range(count):
        theta = 2*math.pi*k/count
        v, i = v0*math.sin(theta), i0*math.sin(theta-phase)
        # L di/dt and the capacitor's integral relation give independent quadrature signs.
        vr = i*r
        vl = i0*xl*math.cos(theta-phase)
        vc = -i0*xc*math.cos(theta-phase)
        samples.append((v, i, v*i, abs(v-vr-vl-vc), i*vr, i*vl, i*vc))
    values = dict(
        impedance_ohm=abs(impedance), phase_degrees=math.degrees(phase),
        current_rms_A=current, power_factor=r/abs(impedance), average_power_W=current**2*r,
        vr_rms_V=current*r, vl_rms_V=current*xl, vc_rms_V=current*xc,
        numerical_voltage_rms_V=math.sqrt(math.fsum(s[0]**2 for s in samples)/count),
        numerical_current_rms_A=math.sqrt(math.fsum(s[1]**2 for s in samples)/count),
        numerical_average_power_W=math.fsum(s[2] for s in samples)/count,
        mean_voltage_V=math.fsum(s[0] for s in samples)/count,
        mean_current_A=math.fsum(s[1] for s in samples)/count,
        maximum_kvl_error_V=max(s[3] for s in samples),
        resistor_average_power_W=math.fsum(s[4] for s in samples)/count,
        inductor_average_power_W=math.fsum(s[5] for s in samples)/count,
        capacitor_average_power_W=math.fsum(s[6] for s in samples)/count,
        minimum_instantaneous_power_W=min(s[2] for s in samples),
        maximum_instantaneous_power_W=max(s[2] for s in samples),
    )
    result.append(dict(input=case, reference=values))
output = Path(__file__).resolve().parents[1]/"audit"/"independent-reference.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(dict(method="Python cmath + math.fsum, no application imports", samples_per_cycle=count, cases=result), indent=2, allow_nan=False), encoding="utf-8")
print(f"Saved {len(result)} independent cases, {count} cycle samples per case.")
