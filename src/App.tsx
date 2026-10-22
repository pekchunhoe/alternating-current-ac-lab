import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  FlaskConical,
  Moon,
  Sun,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import type { LabId, Experiment } from './model';
import { defaults, labNames } from './model';
import Laboratory from './Laboratory';
import { Equation } from './components/UI';
const ids = Object.keys(labNames) as LabId[];
const icons = { waveforms: Waves, rms: Activity, reactance: FlaskConical, power: Zap };
function LabGuide({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="guide-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="guide-title"
    >
      <div className="guide-top">
        <span className="eyebrow">YOUR FIELD GUIDE</span>
        <button className="icon-button" onClick={onClose} aria-label="Close lab guide">
          <X size={20} />
        </button>
      </div>
      <h2 id="guide-title">A bench for curious minds.</h2>
      <p>Change one thing. Observe what moves. Use the mathematics to explain why.</p>
      <div className="guide-steps">
        <div>
          <Waves />
          <h3>Follow the waveform</h3>
          <p>
            Voltage and current alternate in direction. Drag the cycle-phase cursor to freeze and
            inspect an instant. In the connected circuit, current follows Ohm’s law.
          </p>
        </div>
        <div>
          <Activity />
          <h3>Discover RMS</h3>
          <p>
            Match the average heating of identical AC and DC resistors. RMS describes this
            equivalent heating voltage.
          </p>
          <Equation tex={String.raw`V_{\mathrm{rms}}=\frac{V_0}{\sqrt2}`} />
        </div>
        <div>
          <FlaskConical />
          <h3>Find the balance</h3>
          <p>
            Explore R, L, C and series combinations. At RLC resonance, inductive and capacitive
            reactances cancel.
          </p>
          <Equation tex={String.raw`f_0=\frac1{2\pi\sqrt{LC}}`} />
        </div>
        <div>
          <Zap />
          <h3>Follow the energy</h3>
          <p>
            Instantaneous source power can be negative when stored energy returns. Cycle-average
            power is dissipated only in the resistor.
          </p>
          <Equation tex={String.raw`P_{\mathrm{av}}=V_{\mathrm{rms}}I_{\mathrm{rms}}\cos\phi`} />
        </div>
      </div>
      <div className="guide-conventions">
        <h3>The conventions</h3>
        <Equation block tex={String.raw`v_s=V_0\sin(\omega t),\quad i=I_0\sin(\omega t-\phi)`} />
        <p>
          Positive φ: current lags (inductive). Negative φ: current leads (capacitive). Phasors use
          RMS magnitudes: multiply a rotating voltage vector's vertical projection by √2 to obtain
          instantaneous voltage. The dashed current vector shows direction, on its own scale.
        </p>
        <p>
          Ideal, linear components in sinusoidal steady state. Visual playback is slowed
          independently of physical frequency. Flow markers show conventional current schematically.
        </p>
        <p>
          <b>Keyboard:</b> use arrow keys within the main tab row, Tab to move between controls, and
          arrow keys to adjust focused sliders. Reduced-motion mode begins paused.
        </p>
      </div>
      <button className="primary-button" onClick={onClose}>
        Back to the bench <ArrowUpRight size={16} />
      </button>
    </dialog>
  );
}
export default function App() {
  const [active, setActive] = useState<LabId>('waveforms');
  const [experiments, setExperiments] = useState<Record<LabId, Experiment>>(() =>
    structuredClone(defaults),
  );
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ac-lab-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [guide, setGuide] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ac-lab-theme', theme);
    } catch {
      /* Storage may be unavailable in private contexts. */
    }
  }, [theme]);
  return (
    <div className="application">
      <a href="#lab-main" className="skip-link">
        Skip to laboratory
      </a>
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <Waves size={28} strokeWidth={1.6} />
          </div>
          <div>
            <span className="brand-kicker">
              THE PHYSICS COLLECTION <i />
            </span>
            <h1>Alternating Current Lab</h1>
          </div>
        </div>
        <div className="header-actions">
          <span className="header-tag">EXPLORE. OBSERVE. UNDERSTAND.</span>
          <button
            className="icon-button theme-button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="guide-button" aria-label="Lab guide" onClick={() => setGuide(true)}>
            <BookOpen size={16} />
            <span>Lab guide</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      <nav className="lab-navigation" aria-label="Laboratories">
        <div className="tab-list" role="tablist" aria-label="Choose a laboratory">
          {ids.map((id, index) => {
            const Icon = icons[id];
            return (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={active === id}
                aria-controls={`panel-${id}`}
                tabIndex={active === id ? 0 : -1}
                className={active === id ? 'active' : ''}
                onClick={() => setActive(id)}
                onKeyDown={(e) => {
                  let next: number | undefined;
                  if (e.key === 'ArrowRight') next = (index + 1) % ids.length;
                  if (e.key === 'ArrowLeft') next = (index - 1 + ids.length) % ids.length;
                  if (e.key === 'Home') next = 0;
                  if (e.key === 'End') next = ids.length - 1;
                  if (next !== undefined) {
                    e.preventDefault();
                    setActive(ids[next]);
                    document.getElementById(`tab-${ids[next]}`)?.focus();
                  }
                }}
              >
                <Icon size={18} />
                <span>{labNames[id]}</span>
                <span className="tab-active-dot" />
              </button>
            );
          })}
        </div>
        <span className="nav-status">
          <span className="status-dot active" />
          Virtual bench ready
        </span>
      </nav>
      <main id="lab-main">
        <Laboratory
          key={active}
          lab={active}
          p={experiments[active]}
          onChange={(p) => setExperiments((previous) => ({ ...previous, [active]: p }))}
        />
      </main>
      <footer className="app-footer">
        <div>
          <Waves size={18} />
          <span>Alternating Current Lab</span>
          <span className="footer-separator">/</span>
          <span>Built for discovery.</span>
        </div>
        <button className="text-button" onClick={() => setGuide(true)}>
          <CircleHelp size={14} />
          Model & conventions
        </button>
      </footer>
      {guide && <LabGuide onClose={() => setGuide(false)} />}
    </div>
  );
}
