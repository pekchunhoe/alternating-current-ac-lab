# Screenshot evidence

Captured from the local production build using Microsoft Edge/Chromium on 22 October 2026. All four laboratories were visually inspected in both themes at 1440×1000 desktop and 390×844 mobile viewport sizes. Full-page images include the controls, measurements, plots, phasors, calculations and challenge panel; viewport images document the initial framing.

## Four laboratories, both themes and sizes

| Laboratory            | Desktop dark                                                                                                       | Desktop light                                                                                                        | Mobile dark                                                                                                      | Mobile light                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| AC Waveforms          | [Full](../screenshots/desktop-dark-waveforms.png) · [Viewport](../screenshots/desktop-dark-waveforms-viewport.png) | [Full](../screenshots/desktop-light-waveforms.png) · [Viewport](../screenshots/desktop-light-waveforms-viewport.png) | [Full](../screenshots/mobile-dark-waveforms.png) · [Viewport](../screenshots/mobile-dark-waveforms-viewport.png) | [Full](../screenshots/mobile-light-waveforms.png) · [Viewport](../screenshots/mobile-light-waveforms-viewport.png) |
| RMS Values            | [Full](../screenshots/desktop-dark-rms.png) · [Viewport](../screenshots/desktop-dark-rms-viewport.png)             | [Full](../screenshots/desktop-light-rms.png) · [Viewport](../screenshots/desktop-light-rms-viewport.png)             | [Full](../screenshots/mobile-dark-rms.png) · [Viewport](../screenshots/mobile-dark-rms-viewport.png)             | [Full](../screenshots/mobile-light-rms.png) · [Viewport](../screenshots/mobile-light-rms-viewport.png)             |
| Reactance & Impedance | [Full](../screenshots/desktop-dark-resonance.png) · [Viewport](../screenshots/desktop-dark-resonance-viewport.png) | [Full](../screenshots/desktop-light-resonance.png) · [Viewport](../screenshots/desktop-light-resonance-viewport.png) | [Full](../screenshots/mobile-dark-resonance.png) · [Viewport](../screenshots/mobile-dark-resonance-viewport.png) | [Full](../screenshots/mobile-light-resonance.png) · [Viewport](../screenshots/mobile-light-resonance-viewport.png) |
| Power & Power Factor  | [Full](../screenshots/desktop-dark-power.png) · [Viewport](../screenshots/desktop-dark-power-viewport.png)         | [Full](../screenshots/desktop-light-power.png) · [Viewport](../screenshots/desktop-light-power-viewport.png)         | [Full](../screenshots/mobile-dark-power.png) · [Viewport](../screenshots/mobile-dark-power-viewport.png)         | [Full](../screenshots/mobile-light-power.png) · [Viewport](../screenshots/mobile-light-power-viewport.png)         |

## Six phasor configurations

These close views were captured at a common source phase of 37.2°. Voltage vectors use RMS magnitude on one scale; current is a separate direction indicator. Browser assertions independently verify the signed source/current angle and the √2 voltage projection conversion.

| Circuit | Desktop clip                               | Mobile clip                               |
| ------- | ------------------------------------------ | ----------------------------------------- |
| R       | [View](screenshots/desktop-phasor-R.png)   | [View](screenshots/mobile-phasor-R.png)   |
| L       | [View](screenshots/desktop-phasor-L.png)   | [View](screenshots/mobile-phasor-L.png)   |
| C       | [View](screenshots/desktop-phasor-C.png)   | [View](screenshots/mobile-phasor-C.png)   |
| RL      | [View](screenshots/desktop-phasor-RL.png)  | [View](screenshots/mobile-phasor-RL.png)  |
| RC      | [View](screenshots/desktop-phasor-RC.png)  | [View](screenshots/mobile-phasor-RC.png)  |
| RLC     | [View](screenshots/desktop-phasor-RLC.png) | [View](screenshots/mobile-phasor-RLC.png) |

## Stress cases and additional layouts

| Case                                                                    | Desktop                                                 | Mobile                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Source/current/component traces at an off-sample phase                  | [View](screenshots/desktop-rlc-component-traces.png)    | [View](screenshots/mobile-rlc-component-traces.png)    |
| Milliwatt RMS heating, exact match and successful challenge             | [View](screenshots/desktop-low-power-rms.png)           | [View](screenshots/mobile-low-power-rms.png)           |
| Small-power scientific notation and successful negative-power challenge | [View](screenshots/desktop-small-power-mathematics.png) | [View](screenshots/mobile-small-power-mathematics.png) |
| Extreme inductive impedance and microampere meter                       | [View](screenshots/desktop-extreme-meters.png)          | [View](screenshots/mobile-extreme-meters.png)          |

Additional captures: [narrow high-Q resonance](../screenshots/high-q-resonance.png), [tablet power laboratory](../screenshots/tablet-power.png).

The gallery contains 54 application images: 32 laboratory/theme/size views, 12 phasor clips, 8 stress-case views and 2 additional captures. The PDF page renders in `curriculum-source/` are separate source evidence.

The extreme-frequency capture uses a 60 ms window at 10,000 Hz: it contains 600 cycles, so the traces appear dense. The two-cycle window separately tested in the browser resolves individual sinusoids at this frequency.

Visual review caught clipped mobile chart tick labels, which page-width checks had missed. Mobile graph margins and scientific tick notation were corrected, and text-boundary assertions were added for default and extreme-value graphs. Equation wrapping, engineering meter units and phasor label spacing were also reviewed. Final images are the corrected captures. No screenshots were retouched.
