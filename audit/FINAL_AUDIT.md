# Final curriculum and physics audit

22 October 2026 · Asia/Kuala_Lumpur · local production build

## Finding

All Alternating Current learning outcomes on the supplied curriculum pages 10–11 are covered after the corrections below. The ordinary steady-state equations, phase convention and resonance calculations were already correct. The audit found teaching-text, low-power grading, exact-cursor, SVG interaction and numerical-presentation defects and corrected them without replacing the existing design or removing working features.

The PDF was accessible, extracted, rendered and read, including its equations. See the [27-row compliance matrix](CURRICULUM_COMPLIANCE.md), [source provenance](curriculum-source/provenance.json), [page 10 image](curriculum-source/pdf-page-10.png) and [page 11 image](curriculum-source/pdf-page-11.png). The earlier implementation report's PDF-access limitation is resolved by this audit.

## Problems corrected

| Finding                                                                                                                                   | Correction and validation                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The AC definition and the equivalent-heating definitions of both RMS current and voltage were not explicit enough.                        | Added concise definitions and resistance/reactance/impedance explanations. Browser checks verify the text is visible and expanded math fits.                                                                                         |
| Pure-inductor teaching text suggested its phase lag grew with frequency.                                                                  | Pure L is explicitly fixed at +90°, pure C at −90° for every positive frequency. Frequency changes reactance and current, not these pure-component angles. Component and browser checks cover this.                                  |
| RMS phasor projections were described as directly equal to instantaneous voltage.                                                         | Caption and guide state the √2 conversion. Tests reconstruct the instantaneous sine voltage from the actual RMS vector projection.                                                                                                   |
| Independent waveform mode displayed a resistor-voltage vector despite having independent amplitudes.                                      | Removed component vectors and the sum construction in this mode; retained the independent source/current directions.                                                                                                                 |
| Waveform cursor markers used the closest sampled trace point.                                                                             | Exact analytical cursor values now share the current phase with meters, current direction and phasors, including off-sample phase selections.                                                                                        |
| Clicking the frequency plot ignored SVG letterboxing; touch drag could scroll the page.                                                   | Map pointer positions through the inverse SVG screen transform, capture the pointer, and set the graph touch behavior. Desktop and real synthetic touch-event dragging are tested against independent target frequencies.            |
| A fixed 0.001 W heating tolerance could accept a 20% error while advertising 1%.                                                          | Use 1% relative power error, including milliwatt powers. Explicitly handle an unpowered AC reference. Boundary and browser tests verify success/failure.                                                                             |
| The same absolute tolerance floor could accept zero for a small positive power answer or a substantial relative reactance error.          | Numerical challenges now enforce their stated 1% relative tolerance; independently calculated small answers pass and wrong answers fail.                                                                                             |
| A fixed negative-power threshold made the instantaneous-power challenge impossible for small-power circuits.                              | Use a floating-point-scale sign threshold relative to apparent power; a low-power RC negative interval now completes the challenge.                                                                                                  |
| Focusing and leaving a rounded number field could quantize an untouched exact-resonance value.                                            | Commit only an actual draft edit; preserve the full model value on untouched blur. Browser checks confirm the exact current vector is unchanged.                                                                                     |
| JavaScript exponent strings were not valid mathematical scientific notation in KaTeX. Some challenge solutions used plain-text fractions. | Added a tested powers-of-ten formatter and typeset challenge solutions, guide fractions, heater scale and power-triangle relation. Added the curriculum's real/apparent power notation aliases.                                      |
| Long substituted equations and extreme-value meter strings risked crowding mobile layouts.                                                | Split substitutions into aligned steps; use engineering units for very small/large current and impedance. Browser checks include all visible equation widths and extreme meter widths.                                               |
| Actual mobile screenshots revealed graph tick labels clipped at panel edges, despite no page overflow.                                    | Replaced negative graph margins with internal spacing and use compact scientific tick notation with actual superscript exponents for extreme values. Added text-boundary checks for chart ticks in all labs/themes and stress cases. |
| Nearly coincident current and resistor vectors could crowd their labels.                                                                  | Place the current label inward and voltage labels outward; inspect all six phasor screenshots. Voltage/current vector mathematics is unchanged.                                                                                      |
| Missing components could remain in the trace legend.                                                                                      | Only list components present in the chosen mode.                                                                                                                                                                                     |
| Sampling-count and extreme clock arguments had incomplete validation.                                                                     | Reject invalid sample counts and nonfinite clock increments, normalize negative phase, and calculate logarithmic frequency positions without overflowing a high/low ratio. Edge-case tests pass.                                     |

## Physics conventions checked

Screenshot review also found that very small circuit currents could round to `0.0 mA`, a 1.5%-of-peak dead band labeled nonzero current as a zero crossing, and remaining meter/reference annotations used programming exponent strings. Circuit current now uses appropriate SI prefixes, the zero-direction threshold is limited to numerical zero, and small/large numerical labels use superscript powers of ten. A small-power browser regression checks the negative nanoampere current direction and its readable value. Very small positive powers within the UI range are no longer rounded to zero by an absolute 10⁻⁹ display cutoff.

The milliwatt RMS screenshot exposed two related presentation defects: heater power rounded to `0.00 W`, and small current-axis divisions rounded to repeated zero labels. Heater/readout powers now use appropriate SI prefixes (2.50 mW versus 3.00 mW for the mismatch case), and fractional axis labels retain significant digits. Browser checks verify those numerical displays and keep all tick text inside its panel.

The source is `v(t)=V₀sin(ωt)` and current is `i(t)=I₀sin(ωt−φ)`. Positive φ means lagging current. `φ=atan2(X_L−X_C,R)`, so pure R/L/C give 0°/+90°/−90°. RL is inductive, RC capacitive, and RLC changes sign across resonance. The inverse-tangent curriculum formula is also shown when R>0.

All voltage vectors use a common RMS scale. The current vector is explicitly directional on a separate scale. Component voltages satisfy instantaneous Kirchhoff addition and the RMS vector identity. Frequency curves use actual logarithmic coordinates and include the selected frequency and exact resonance, with extra samples resolving narrow peaks.

Power checks cover R, RC, RL and RLC: instantaneous product, numerical cycle mean, RMS power factor, and resistor-only average dissipation. Ideal L/C exchange energy with zero average dissipation. Positive/negative reactive power signs and the existing power-triangle relation remain consistent.

## Independent numerical evidence

[Python reference script](../scripts/independent-reference.py) uses standard-library complex arithmetic and compensated summation, with no application imports. Ten reference circuits use 8,192 phase samples each. A [separate comparison script](../scripts/physics-evidence.mjs) compares eight application outputs per case against those references and records application cycle averages and voltage-addition residuals.

All 80 direct reference comparisons passed the stated tolerance `1e−10 × max(1, |reference|)`. Maximum application instantaneous voltage-addition residual over 1,024 samples in each of ten cases: **1.0913936421275139 × 10⁻¹¹ V**. This is floating-point cancellation, including large component voltages near resonance.

| Reference                                        | Verified result                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Sine source, 10 V peak                           | RMS 7.071067811865475 V; zero mean; 5 W into 10 Ω                               |
| Pure R/L/C                                       | φ = 0° / +90° / −90°; ideal L/C average power zero                              |
| RL, R=30 Ω, X_L=40 Ω, 100 V RMS                  | Z=50 Ω; φ=53.1301023542°; I=2 A RMS; PF=0.6; P=120 W                            |
| RLC, L=0.1 H, C=100 µF                           | f₀=50.329212104487034 Hz; below resonance capacitive, above resonance inductive |
| Same RLC, R=20 Ω, 12 V RMS at f₀                 | Z=20 Ω; I=0.6 A RMS; P=7.2 W; PF=1; φ=0°                                        |
| Component voltages at that resonance             | V_L=V_C=18.9736659610 V RMS, correctly exceeding the 12 V supply individually   |
| Narrow resonance, L=2 H, C=1 µF, R=1 Ω, 12 V RMS | f₀≈112.53954 Hz; I at resonance=12 A RMS; exact peak retained in graph          |
| Low-power heater, 1 V peak, 200 Ω                | P_AC=0.0025 W; P_DC=0.003 W is 20% high and correctly fails the 1% match        |

Machine-readable evidence: [independent references](independent-reference.json), [application comparisons](physics-evidence.json).

## Automated verification

| Check                                | Final result                                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                               | **67 passed**, zero failed: 47 physics tests and 20 component/integration tests across four files; [JSON result](unit-results.json)                  |
| ESLint                               | Passed                                                                                                                                               |
| TypeScript and Vite production build | Passed                                                                                                                                               |
| Production-build browser suite       | **32 passed**, zero failed/skipped/flaky, final run 1.7 minutes; [JSON result](browser-results.json), [HTML report](../playwright-report/index.html) |
| Automated accessibility              | 16 lab/theme/viewport scans, zero violations under the tested WCAG A/AA tags; results attached to the browser report                                 |

The expanded physics tests include all 192 combinations of circuit mode and UI parameter extrema, checking 19 phases each (3,648 phase evaluations); all-six-mode numerical RMS and energy balance; resonance scaling and minimum impedance; strict small-power tolerances; numerical notation; and invalid sampling/clock arguments. Component tests inspect actual SVG vector endpoints, phase signs, RMS projections, vector closure, independent signals, input precision and the animation-loop lifecycle.

The [final evidence manifest](final-verification.json) records actual test statistics, numerical residuals, the verified PDF hash, production entry hash, source/test hashes, and all 54 screenshot hashes and dimensions. It verifies that the browser result follows the final unit run and that every application screenshot was regenerated during that browser run.

Browser tests preserve the existing interaction suite and add curriculum-definition checks, exact cursor comparisons, all-six-mode vector angles, accurate SVG selection, touch dragging, milliwatt heating, tiny-power challenge grading, scientific notation, extreme units and unchanged exact inputs. Original coverage includes presets, reset, retained state, pause/replay, reduced motion, keyboard tabs, CSV, fullscreen, high-Q resonance and automated accessibility checks.

Reproduce locally:

```powershell
npm.cmd test -- --reporter=default --reporter=json --outputFile=audit/unit-results.json
npm.cmd run lint
npm.cmd run build
# Start this in a separate terminal so Windows server teardown is explicit:
npm.cmd run preview -- --port 5173 --strictPort
# In another terminal:
$env:AC_LAB_PRODUCTION='1'
npm.cmd run test:browser
python scripts\independent-reference.py
node scripts\physics-evidence.mjs
```

The PDF extraction helper additionally requires PyMuPDF; it is audit tooling, not a browser/application dependency. Its output includes source page images and provenance.

## Screenshots and scope

See the [screenshot index](SCREENSHOTS.md) for all four laboratories in both themes at desktop and mobile sizes, all-six-mode phasor clips, and additional stress cases. Source page images are retained separately from application screenshots.

Browser verification uses installed Microsoft Edge/Chromium: 1440×1000 desktop, 390×844 mobile emulation with touch, and additional 768×1024 layout checks. It does not establish physical-device, Safari or Firefox behavior. Automated accessibility checks are not a substitute for a manual assistive-technology usability study.

The ideal sinusoidal steady-state model and existing attractive instrument design were preserved. No transients, nonideal component models or additional advanced topics were introduced. No commit, push, publication or deployment was performed.
