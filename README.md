# Alternating Current Lab

A local, browser-based physics laboratory built with React, TypeScript, and Vite. No backend, accounts, API keys, or runtime network service is required.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173). The production application is generated in `dist/`:

```powershell
npm.cmd run build
npm.cmd run preview
```

## The laboratories

- **AC Waveforms:** a connected resistor or explicitly independent signals; voltage, current, frequency and period; conventional current reversal; a dual-axis oscilloscope; freezeable sine phasors; phase scrubbing; fixed physical time windows and slow-motion playback.
- **RMS Values:** identical AC/DC resistors, calculated average-power glow, equal-heating feedback, voltage and squared-voltage graphs, RMS and mean-square reference lines, numerical cycle averaging, and the root-mean-square explanation.
- **Reactance & Impedance:** functional R, C, L, RL, RC, and RLC circuits; source/current/component traces; signed phase; rotating and current-reference phasors; component-voltage vector addition; logarithmic frequency sweeps of R, Xₗ, X꜀, Z or current; and exact-resonance tuning.
- **Power & Power Factor:** series R, RC, RL, and RLC circuits; synchronized source signals and instantaneous power; average-power reference; power factor gauge; signed reactive power and a power triangle; and a series compensation experiment.

All laboratories have live typeset calculations, numerical inputs and sliders, experiment presets, reset, playback, guided challenges with tolerances, hints, and calculated feedback. Dark/light themes, keyboard tabs, reduced motion, CSV export, and fullscreen graphs are included.

## Architecture and source files

| File                                                                                        | Responsibility                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/physics/ac.ts`                                                                         | Independent SI-unit physics engine, complex impedance, RMS, instantaneous component voltages, resonance, power, sampling, validation, clock arithmetic, formatting |
| `src/physics/ac.test.ts`                                                                    | Analytical references, Kirchhoff and energy invariants, integration, boundary/invalid inputs, and clock tests                                                      |
| `src/model.ts`                                                                              | Typed experiment state, defaults, circuit input conversion, descriptive presets                                                                                    |
| `src/hooks/useClock.ts`                                                                     | One requestAnimationFrame clock per mounted laboratory, pause/resume/replay/reset, visual speed, reduced-motion handling and cleanup                               |
| `src/App.tsx`                                                                               | Application shell, accessible tab navigation, retained per-laboratory settings, theme persistence and lab guide                                                    |
| `src/Laboratory.tsx`                                                                        | Instrument integration, live measurements, playback, power-factor gauge and power triangle                                                                         |
| `src/components/Controls.tsx`                                                               | Relevant component controls, modes, source settings and presets                                                                                                    |
| `src/components/Circuit.tsx`                                                                | Electrical circuit symbols, source polarity and signed conventional current markers                                                                                |
| `src/components/Plots.tsx`                                                                  | Memoized analytical SVG traces, independent labeled axes, tooltips, time cursors, sweep tuning, CSV and fullscreen                                                 |
| `src/components/Phasor.tsx`                                                                 | Shared-scale voltage vectors, current direction reference, rotation and vector addition                                                                            |
| `src/components/Heating.tsx`                                                                | Identical resistor comparison with power-driven glow                                                                                                               |
| `src/components/Calculations.tsx`                                                           | Expandable Live Calculations, substitutions, numerical results and interpretations                                                                                 |
| `src/components/Challenges.tsx`                                                             | Experimental and quantitative challenges checked against actual physics state                                                                                      |
| `src/components/UI.tsx`                                                                     | KaTeX equations, accessible synchronized inputs, panels and metrics                                                                                                |
| `src/styles.css`                                                                            | Responsive instrument design, semantic colors, both themes and reduced-motion styles                                                                               |
| `src/App.test.tsx`, `src/test/setup.ts`                                                     | Integrated component tests and test environment                                                                                                                    |
| `tests/laboratory.spec.ts`                                                                  | Real-browser interactions, responsive/theme screenshots, labels, keyboard, reduced motion and axe accessibility checks                                             |
| `index.html`, `src/main.tsx`, `public/favicon.svg`                                          | Browser metadata, application entry and icon                                                                                                                       |
| `package.json`, `package-lock.json`                                                         | Commands and pinned dependency resolution                                                                                                                          |
| `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `.gitignore` | Type, build, static analysis and testing configuration                                                                                                             |

## Scientific conventions

The source is the sine reference: vₛ(t) = V₀ sin(ωt), i(t) = I₀ sin(ωt − φ). Positive φ means lagging current; negative φ means leading current. The engine uses `atan2(Xₗ − X꜀, R)` and the complex impedance R + j(Xₗ − X꜀). Phasors project vertically onto these sine waveforms.

Voltage vectors share one RMS scale. The dashed current phasor has an independent, explicitly directional scale. Component voltages add as vectors, including when individual component magnitudes exceed supply voltage.

Interactive resistive circuit modes require positive resistance. Frequency, capacitance and inductance must be positive. Invalid inputs never replace the last valid model state. Parameters are stored in SI; mH, µF and ms are display conversions. Full precision is retained internally; display values are rounded.

Animation uses a clearly labeled slow-motion viewing clock: at 1×, one cycle takes eight visual seconds. Its physical time remains θ/ω. The oscilloscope pans if the cycle cursor leaves a fixed physical window. Sampling increases with the number of visible cycles to avoid undersampling high-frequency signals.

Resonance is reported when |Xₗ − X꜀| / max(Xₗ, X꜀) ≤ 0.001. Equal-heating and quantitative-answer tolerances are 1% relative to the calculated target, including small powers; they have no fixed absolute floor. These tolerances do not change the model values. RMS voltage-vector projections require a factor of √2 to give instantaneous voltages; the current vector shows direction on a separate scale.

Heater glow uses the same bounded average-power response P/(P + 20 W). It does not claim a temperature calculation. Flow markers indicate conventional current schematically, not electron drift speed. Series reactive compensation changes impedance, current and real power at fixed source voltage; it is explicitly distinguished from parallel capacitor-bank correction.

## Validation commands

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:browser
```

Browser tests use the installed Microsoft Edge in headless mode, at 1440 × 1000 and 390 × 844, with additional 768 × 1024 checks. To use bundled Chromium instead, remove `channel: 'msedge'` from `playwright.config.ts` and install Playwright Chromium. Browser test runs create `screenshots/`, `test-results/`, and `playwright-report/`.

See the [final audit](audit/FINAL_AUDIT.md), [curriculum compliance matrix](audit/CURRICULUM_COMPLIANCE.md), [numerical evidence](audit/physics-evidence.json), and [screenshot index](audit/SCREENSHOTS.md) for the current validation. `VALIDATION.md` preserves the earlier implementation report and is superseded by this audit. Additional edge-case tests are in `src/physics/audit.test.ts`, `src/components/Audit.test.tsx`, and `tests/curriculum-audit.spec.ts`; independent reference scripts are in `scripts/`.

## Scope and limitations

The model is ideal sinusoidal steady-state AC. It does not simulate switch-on transients, parasitic loss, nonlinear components, thermal dynamics or a microscopic carrier model. These are outside the requested scope.

The final audit actually read and visually verified pages 10–11 of the supplied curriculum PDF. The report retains source provenance and a matrix covering every relevant AC learning outcome. Browser verification covers Edge/Chromium with mobile viewport and touch emulation, not physical phones or Safari/Firefox. Experiment parameters are retained while navigating within the app; only the theme persists after a page reload.

All work stays local. No Git commit, push, publication or deployment is performed.

## Library references

[Vite guide](https://vite.dev/guide/) · [KaTeX API](https://katex.org/docs/api) · [Playwright documentation](https://playwright.dev/docs/intro)
