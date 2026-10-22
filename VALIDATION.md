# Alternating Current Lab — implementation and validation report

> Historical initial-implementation report. The [final curriculum and physics audit](audit/FINAL_AUDIT.md) supersedes these test counts and findings. The final audit read the supplied PDF, corrected the fixed tolerance floors and other issues, expanded the suite, and regenerated screenshots. References below to unavailable PDF material describe the earlier implementation only.

Completed locally on 22 October 2026 (Asia/Kuala_Lumpur).

## Implementation summary

All four requested laboratories are implemented in React and TypeScript, with a separate SI-unit physics engine and responsive dark/light instrument themes. The shared model drives the circuit, waveform traces, current direction, phasors, readings, power, calculations, and challenge feedback.

- **AC Waveforms:** connected resistive or explicitly independent signals, source/current amplitude controls, frequency, physical time windows, cycle-phase scrubbing, period/angular-frequency readings, reversing current, phasors and guided activities.
- **RMS Values:** identical AC/DC resistors, average-power-driven glow, a 1% equal-heating challenge, voltage/RMS and squared-voltage/mean-square plots, numerical mean-square verification, and expandable RMS reasoning.
- **Reactance & Impedance:** R, C, L, RL, RC and RLC; component controls and traces; signed phase; consistent component-voltage vectors; impedance/current/phase/power readings; analytical frequency response and exact-resonance tuning.
- **Power & Power Factor:** series R, RC, RL and RLC; instantaneous and average power; negative-power intervals; power-factor gauge; signed power triangle; and series capacitance compensation with correct real-power interpretation.

Shared features include synchronized slow-motion playback, pause/replay/reset, numerical input validation, presets, trace visibility, rotating/current-reference phasors, live KaTeX calculation steps, hints and quantitative challenges, CSV downloads, fullscreen graphs, keyboard tabs, a lab guide and reduced-motion behavior.

## Architecture

`src/physics/ac.ts` owns the mathematical model independently of React. `src/model.ts` owns experiment defaults, SI conversion and presets. `src/hooks/useClock.ts` owns the single mounted simulation clock. `src/Laboratory.tsx` integrates the instruments, and `src/components/` contains the controls, circuit, plots, phasors, heating comparison, calculations and challenges. `src/App.tsx` owns navigation, per-laboratory parameter state, theme and the guide.

SVG paths come from sampled analytical values. Voltage and current have separately labeled axes. Frequency sweeps retain their actual frequency coordinates, explicitly include resonance and the operating point, and add samples around the resonance bandwidth so a narrow current maximum is represented correctly. Static curve construction is memoized separately from the moving cursor. Numerical precision is preserved internally.

The source file inventory and responsibilities are in [README.md](README.md).

## Scientific validation

These references passed independent engine tests and were also calculated separately using Python's standard `math` module:

| Reference                                                       | Verified result                                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Sinusoid, 10 V peak                                             | RMS = 7.071067811865475 V; full-cycle mean approximately zero; quarter-cycle values 0, +10, 0, −10, 0 V                |
| 10 V peak into 10 Ω                                             | Average power = 5 W; equal-heating DC voltage = 7.071067811865475 V                                                    |
| Pure R, L and C                                                 | Signed phases 0°, +90° and −90°, respectively                                                                          |
| RL with R = 30 Ω, Xₗ = 40 Ω, source = 100 V rms                 | Z = 50 Ω; φ = 53.1301023542°; I = 2 A rms; PF = 0.6; average power = 120 W                                             |
| RLC with L = 0.1 H, C = 100 µF                                  | Resonance = 50.329212104487034 Hz; Xₗ = X꜀ = 31.6227766017 Ω                                                           |
| Same RLC, R = 20 Ω, source = 12 V rms, at resonance             | Z = 20 Ω; I = 0.6 A rms; average power = 7.2 W; φ = 0°; PF = 1                                                         |
| Component voltage at that resonance                             | Vₗ = V꜀ = 18.9736659610 V rms, correctly exceeding the 12 V supply                                                     |
| Narrow resonance, L = 2 H, C = 1 µF, R = 1 Ω, source = 12 V rms | Exact peak included in the frequency sweep; peak RMS current = 12 A; browser graph cursor agrees with the current axis |

For all six circuit modes, numerical tests verify instantaneous Kirchhoff voltage addition at 257 phase samples and agreement between integrated instantaneous power, RMS power-factor power, and resistive heating. Ideal pure reactive components have zero average power and both positive and negative instantaneous power. Additional tests cover low/high frequencies, extreme component values, valid zero resistance in pure reactive modes, invalid inputs, rapid model changes, clock wrapping and tiny time steps.

## Executed checks

Final checks were executed against the completed source. Earlier failures were corrected and relevant checks rerun.

| Check                      | Final result                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physics tests              | **26 passed, 0 failed**                                                                                                                              |
| Integrated component tests | **7 passed, 0 failed**                                                                                                                               |
| Vitest total               | **33 passed, 0 failed**, across two files                                                                                                            |
| Browser scenarios          | **20 passed, 0 failed**, ten scenarios in each of the desktop/mobile projects                                                                        |
| TypeScript                 | **Passed** through `tsc -b`                                                                                                                          |
| ESLint                     | **Passed**, zero errors and zero warnings                                                                                                            |
| Production build           | **Passed**, production files generated in `dist/`                                                                                                    |
| Automated accessibility    | **Passed** for every laboratory in both themes, at desktop and mobile sizes, using axe WCAG A/AA checks                                              |
| Math/label validation      | **Passed**: no visible forbidden curriculum labels, NaN/Infinity, KaTeX errors or horizontally overflowing default equations; correct document title |
| Responsive checks          | **Passed** at 1440 × 1000, 390 × 844 and 768 × 1024, without horizontal page overflow                                                                |

Commands: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:browser`.

The browser scenarios exercise real controls: all tabs and circuit modes; slider/numeric synchronization; reset, including invalid draft input; current reversal; cycle scrubbing; pause/replay and slow motion; AC/DC heating tolerance; exact and high-Q resonance; graph tuning; component traces; phasor reference frames; series power-factor compensation; theme switching; keyboard navigation; reduced motion; guide opening/closing; low/high-frequency graph axes; trace toggles; CSV contents; and entering/exiting fullscreen.

Component tests start with reduced motion enabled so their numerical/control checks are deterministic. Browser tests separately exercise live animation. One earlier parallel test run exceeded the default five-second component-test deadline; the final run used deterministic paused fixtures and passed all tests.

## Visual inspection and screenshots

Saved screenshots were visually inspected for all four laboratories in dark/light themes on desktop/mobile, with an additional tablet inspection. Fixes made during inspection included current-arrow direction, overlapping coincident phasor labels, light-theme text contrast, mobile graph/circuit annotation size, and time-cursor visibility at low frequency. Typeset calculations were also checked for horizontal clipping in the browser.

There are **34 saved PNGs** in `screenshots/`: full-page and viewport views for every desktop/mobile/theme/laboratory combination, plus tablet and high-Q resonance views.

Representative screenshots:

- [AC Waveforms — dark desktop](screenshots/desktop-dark-waveforms.png)
- [RMS Values — dark desktop](screenshots/desktop-dark-rms.png)
- [Resonance — dark desktop](screenshots/desktop-dark-resonance.png)
- [Power analysis — dark desktop](screenshots/desktop-dark-power.png)
- [Resonance — light mobile](screenshots/mobile-light-resonance.png)
- [Power analysis — tablet](screenshots/tablet-power.png)
- [Narrow high-Q resonance](screenshots/high-q-resonance.png)

The machine had no connected visible browser surface for opening an in-chat preview. Actual local browser verification and screenshots were completed using headless Microsoft Edge via Playwright. After the full 20-test run passed, the two circuit scenarios were rerun successfully to retake the high-Q screenshot with the page scrolled to the top. The HTML report at `playwright-report/index.html` contains this latest focused two-test run; the full-suite result is recorded above.

## Files created

The workspace was empty. All application files are new; no existing application or neighboring project was modified.

```text
.gitignore
.prettierignore
.prettierrc.json
README.md
VALIDATION.md
eslint.config.js
index.html
package.json
package-lock.json
playwright.config.ts
tsconfig.json
vite.config.ts
public/favicon.svg
src/main.tsx
src/App.tsx
src/App.test.tsx
src/Laboratory.tsx
src/model.ts
src/styles.css
src/hooks/useClock.ts
src/physics/ac.ts
src/physics/ac.test.ts
src/test/setup.ts
src/components/UI.tsx
src/components/Controls.tsx
src/components/Circuit.tsx
src/components/Plots.tsx
src/components/Phasor.tsx
src/components/Heating.tsx
src/components/Calculations.tsx
src/components/Challenges.tsx
tests/laboratory.spec.ts
screenshots/*.png
```

Generated local directories include `node_modules/`, `.npm-cache/`, `dist/`, `test-results/` and `playwright-report/`; dependency, build and transient test directories are ignored by Git.

## Assumptions and remaining verification limits

- The brief was the only supplied attachment. The separately referenced curriculum PDF was not available, so direct comparison with its pages could not be performed. The explicit equations, laboratories and activities in the brief define this implementation's scope.
- Browser testing used Edge/Chromium, including mobile viewport/touch emulation. Physical devices, Safari, Firefox and assistive-technology user testing were not performed. Automated accessibility checks are not a formal accessibility certification.
- The physical model is ideal sinusoidal steady state. Startup transients, parasitic losses, nonlinear components, microscopic drift and temperature dynamics are outside its scope. The interface states its schematic flow and average-power glow assumptions.
- Parameter settings persist during navigation; only theme preference persists across reloads. There is no backend, account system or server-side storage.
- No measured frame-rate, memory-duration benchmark or physical hardware performance claim is made.
- No known major numerical or visual defects remain in the tested configurations.

## Git and deployment status

The workspace is not a Git repository. No repository was initialized, and no commit, push, publication or deployment was performed. All source, screenshots and build artifacts remain local.

Run `npm.cmd run dev` for local development, or `npm.cmd run preview` to serve the production build.
