import { Calculator } from 'lucide-react';
import type { CircuitSolution } from '../physics/ac';
import { atPhase, cycleMean, format, hasC, hasL } from '../physics/ac';
import type { Experiment, LabId } from '../model';
import { Equation } from './UI';
import { texNumber as n } from '../physics/notation';
export function Calculations({
  lab,
  p,
  solution: s,
  theta,
}: {
  lab: LabId;
  p: Experiment;
  solution: CircuitSolution;
  theta: number;
}) {
  const instant = atPhase(s, theta);
  const phaseTex = String.raw`\phi=\operatorname{atan2}(X_L-X_C,R)=${n(s.phaseDegrees)}^\circ`;
  return (
    <details className="panel calculations" open>
      <summary>
        <span>
          <Calculator size={17} />
          Live Calculations
        </span>
        <span className="details-action">
          Explore the mathematics <span className="chevron">⌄</span>
        </span>
      </summary>
      <div className="calculation-body">
        <div className="given">
          <b>Given values</b>
          <span>
            {lab === 'waveforms' || lab === 'rms'
              ? `V₀ = ${format(p.peakVoltage, 2)} V`
              : `Vᵣₘₛ = ${format(s.voltageRms, 2)} V`}{' '}
            · f = {format(s.frequency, 3)} Hz ·{' '}
            {p.signalMode && lab === 'waveforms' ? 'independent signals' : `${s.mode} circuit`}
          </span>
        </div>
        {lab === 'waveforms' ? (
          <div className="calculation-grid">
            <div>
              <span className="step-label">Frequency → period</span>
              <Equation
                block
                tex={String.raw`\omega=2\pi f=2\pi(${n(s.frequency)})=${n(s.omega)}\;\mathrm{rad\,s^{-1}}`}
              />
              <Equation
                block
                tex={String.raw`T=\frac{1}{f}=\frac{1}{${n(s.frequency)}}=${n(s.period * 1000)}\;\mathrm{ms}`}
              />
            </div>
            <div>
              <span className="step-label">Phase → instantaneous values</span>
              <Equation
                block
                tex={String.raw`\begin{aligned}v(t)&=V_0\sin(\omega t)\\&=${n(p.peakVoltage)}\sin(${n(theta)})=${n(instant.voltage)}\;\mathrm V\end{aligned}`}
              />
              <Equation
                block
                tex={String.raw`\begin{aligned}i(t)&=I_0\sin(\omega t)\\&=${n(p.signalMode ? p.peakCurrent : s.currentPeak)}\sin(${n(theta)})\\&=${n((p.signalMode ? p.peakCurrent : s.currentPeak) * Math.sin(theta))}\;\mathrm A\end{aligned}`}
              />
              <p>
                In this introductory in-phase case, both signals cross zero together.{' '}
                {p.signalMode
                  ? 'Amplitudes are independent.'
                  : `Ohm’s law fixes the peak current at ${format(s.currentPeak, 3)} A.`}
              </p>
            </div>
          </div>
        ) : lab === 'rms' ? (
          <>
            <div className="calculation-grid">
              <div>
                <span className="step-label">Square → mean → root</span>
                <Equation
                  block
                  tex={String.raw`\langle v^2\rangle=\frac{V_0^2}{2}=\frac{${n(p.peakVoltage)}^2}{2}=${n(s.voltageRms ** 2)}\;\mathrm{V^2}`}
                />
                <Equation
                  block
                  tex={String.raw`V_{\mathrm{rms}}=\sqrt{\langle v^2\rangle}=\frac{${n(p.peakVoltage)}}{\sqrt2}=${n(s.voltageRms)}\;\mathrm V`}
                />
                <p>
                  Numerical mean square (2,048 cycle samples):{' '}
                  {format(
                    cycleMean((t) => (p.peakVoltage * Math.sin(t)) ** 2),
                    5,
                  )}{' '}
                  V².
                </p>
              </div>
              <div>
                <span className="step-label">Equivalent heating</span>
                <Equation
                  block
                  tex={String.raw`I_{\mathrm{rms}}=\frac{I_0}{\sqrt2}=${n(s.currentRms)}\;\mathrm A`}
                />
                <Equation
                  block
                  tex={String.raw`P_{\mathrm{av}}=\frac{V_{\mathrm{rms}}^2}{R}=\frac{${n(s.voltageRms)}^2}{${n(s.r)}}=${n(s.averagePower)}\;\mathrm W`}
                />
                <Equation
                  block
                  tex={String.raw`P_{\mathrm{DC}}=\frac{V_{\mathrm{DC}}^2}{R}=\frac{${n(p.dcVoltage)}^2}{${n(s.r)}}=${n(p.dcVoltage ** 2 / s.r)}\;\mathrm W`}
                />
              </div>
            </div>
            <details className="concept-detail">
              <summary>Why root mean square?</summary>
              <Equation
                block
                tex={String.raw`V_{\mathrm{rms}}=\sqrt{\frac1T\int_0^T v^2(t)\,dt}`}
              />
              <p>
                Squaring makes both half-cycles positive. Average over a full cycle, then take the
                square root to return to volts. The mean voltage is zero; its heating effect is not.
              </p>
            </details>
          </>
        ) : lab === 'reactance' ? (
          <div className="calculation-grid">
            <div>
              <span className="step-label">Components → reactance</span>
              {hasL(s.mode) && (
                <Equation
                  block
                  tex={String.raw`X_L=2\pi fL=2\pi(${n(s.frequency)})(${n(s.inductance)})=${n(s.xl)}\;\Omega`}
                />
              )}
              {hasC(s.mode) && (
                <Equation
                  block
                  tex={String.raw`X_C=\frac1{2\pi fC}=\frac1{2\pi(${n(s.frequency)})(${n(s.capacitance)})}=${n(s.xc)}\;\Omega`}
                />
              )}
              <Equation
                block
                tex={String.raw`\begin{aligned}\widetilde Z&=R+j(X_L-X_C)\\&=${n(s.r)}${s.x >= 0 ? '+' : ''}${n(s.x)}j\;\Omega\end{aligned}`}
              />
              <Equation block tex={String.raw`Z=\sqrt{R^2+(X_L-X_C)^2}=${n(s.z)}\;\Omega`} />
            </div>
            <div>
              <span className="step-label">Impedance → current & phase</span>
              <Equation
                block
                tex={String.raw`I_{\mathrm{rms}}=\frac{V_{\mathrm{rms}}}{Z}=\frac{${n(s.voltageRms)}}{${n(s.z)}}=${n(s.currentRms)}\;\mathrm A`}
              />
              <Equation block tex={phaseTex} />
              {s.r > 0 && (
                <Equation block tex={String.raw`\phi=\tan^{-1}\!\left(\frac{X_L-X_C}{R}\right)`} />
              )}
              <Equation
                block
                tex={String.raw`V_{\mathrm{rms}}=\sqrt{V_R^2+(V_L-V_C)^2}=${n(s.voltageRms)}\;\mathrm V`}
              />
              <p>
                RMS component voltages: Vᵣ = {format(s.vr, 3)} V; Vₗ = {format(s.vl, 3)} V; V꜀ ={' '}
                {format(s.vc, 3)} V. Add them as vectors.
              </p>
            </div>
          </div>
        ) : (
          <div className="calculation-grid">
            <div>
              <span className="step-label">Synchronized voltage × current</span>
              <Equation block tex={String.raw`v(t)=V_0\sin(\omega t)`} />
              <Equation block tex={String.raw`i(t)=I_0\sin(\omega t-\phi)`} />
              <Equation
                block
                tex={String.raw`\begin{aligned}p(t)&=v(t)i(t)\\&=(${n(instant.voltage)})(${n(instant.current)})\\&=${n(instant.power)}\;\mathrm W\end{aligned}`}
              />
              <Equation block tex={String.raw`\mathrm{PF}=\cos\phi=\frac RZ=${n(s.pf)}`} />
            </div>
            <div>
              <span className="step-label">Average over one complete cycle</span>
              <Equation
                block
                tex={String.raw`P_{\mathrm{av}}=V_{\mathrm{rms}}I_{\mathrm{rms}}\cos\phi`}
              />
              <Equation
                block
                tex={String.raw`\begin{aligned}P_{\mathrm{av}}&=(${n(s.voltageRms)})(${n(s.currentRms)})(${n(s.pf)})\\&=${n(s.averagePower)}\;\mathrm W\end{aligned}`}
              />
              <Equation
                block
                tex={String.raw`P_{\mathrm{av}}=I_{\mathrm{rms}}^2R=${n(s.averagePower)}\;\mathrm W`}
              />
              <Equation
                block
                tex={String.raw`P_{\mathrm r}=P_{\mathrm{av}},\quad P_{\mathrm a}=V_{\mathrm{rms}}I_{\mathrm{rms}}`}
              />
              <Equation
                block
                tex={String.raw`\cos\phi=\frac{P_{\mathrm r}}{P_{\mathrm a}}=\frac{P_{\mathrm{av}}}{V_{\mathrm{rms}}I_{\mathrm{rms}}}`}
              />
              <p>
                Numerical cycle average:{' '}
                {format(
                  cycleMean((t) => atPhase(s, t).power),
                  5,
                )}{' '}
                W. Only the resistor dissipates average power.
              </p>
            </div>
          </div>
        )}
        <div className="interpretation">
          <b>What this means</b>
          <p>
            {lab === 'waveforms'
              ? `At ${format(s.frequency, 2)} Hz, the source completes ${format(s.frequency, 2)} cycles each second. The voltage is ${instant.voltage >= 0 ? 'positive' : 'negative'} at this instant.`
              : lab === 'rms'
                ? 'RMS voltage is the DC voltage that produces the same average heating power in an identical resistor. Peak voltage is larger by a factor of √2.'
                : s.mode === 'L'
                  ? 'In an ideal pure inductor, current lags voltage by 90° at every positive frequency. Increasing frequency increases reactance and reduces current, but does not change this angle.'
                  : s.mode === 'C'
                    ? 'In an ideal pure capacitor, current leads voltage by 90° at every positive frequency. Increasing frequency reduces reactance and increases current, but does not change this angle.'
                    : `${s.character === 'in phase' ? 'Source voltage and current are in phase. ' : `Current ${s.character === 'lagging' ? 'lags' : 'leads'} source voltage by ${format(Math.abs(s.phaseDegrees), 2)}°. `}${s.x > 0 ? 'Inductive reactance dominates; increasing frequency increases this lag.' : s.x < 0 ? 'Capacitive reactance dominates; increasing frequency reduces capacitive reactance.' : 'Net reactance is zero.'}`}
          </p>
        </div>
        {lab === 'reactance' && (
          <details className="concept-detail">
            <summary>What resistance, reactance and impedance mean</summary>
            <p>
              Resistance dissipates energy and is independent of frequency for these ideal
              components. Capacitive reactance is opposition to AC due to capacitance; it decreases
              as frequency increases. Inductive reactance is opposition to AC due to inductance; it
              increases with frequency. Impedance is the total opposition to AC, combining
              resistance and net reactance. All are measured in ohms.
            </p>
            <p>
              The phase angle is the angle of source voltage relative to current. At series RLC
              resonance, the reactances cancel: impedance is minimized and current is maximized for
              a fixed supply voltage.
            </p>
          </details>
        )}
        {lab === 'reactance' && (
          <details className="concept-detail">
            <summary>Inspect component voltages and Kirchhoff’s law</summary>
            <Equation block tex={String.raw`v_R=I_0R\sin(\theta-\phi)`} />
            <Equation block tex={String.raw`v_L=I_0X_L\sin(\theta-\phi+\pi/2)`} />
            <Equation block tex={String.raw`v_C=I_0X_C\sin(\theta-\phi-\pi/2)`} />
            <Equation block tex={String.raw`v_s=v_R+v_L+v_C`} />
            <p>
              Now: {format(instant.voltage, 4)} V = {format(instant.vr, 4)} V +{' '}
              {format(instant.vl, 4)} V + {format(instant.vc, 4)} V.
            </p>
            {s.resonanceFrequency !== null && (
              <>
                <Equation
                  block
                  tex={String.raw`f_0=\frac1{2\pi\sqrt{LC}}=${n(s.resonanceFrequency)}\;\mathrm{Hz}`}
                />
                <Equation
                  block
                  tex={String.raw`X_L=X_C,\quad Z_{\min}=R,\quad\phi=0,\quad I_{\mathrm{rms,max}}=\frac{V_{\mathrm{rms}}}{R}`}
                />
              </>
            )}
          </details>
        )}
      </div>
    </details>
  );
}
