import { Flame, Equal, EqualNot } from 'lucide-react';
import { engineeringValue, format, rmsExperiment } from '../physics/ac';
import { Panel, Equation } from './UI';
export function Heating({
  peak,
  resistance,
  dcVoltage,
}: {
  peak: number;
  resistance: number;
  dcVoltage: number;
}) {
  const h = rmsExperiment(peak, resistance, dcVoltage);
  const heater = (kind: string, power: number, voltage: number) => {
    const glow = power / (power + 20);
    const reading = engineeringValue(power, 'W');
    return (
      <div className="heater">
        <div className="heater-label">
          <span>{kind === 'AC' ? '∿' : '⎓'}</span>
          <b>{kind}-powered resistor</b>
        </div>
        <svg
          viewBox="0 0 230 150"
          role="img"
          aria-label={`${kind} resistor, average heating ${reading.value} ${reading.unit}`}
        >
          <defs>
            <radialGradient id={`heat-${kind}`}>
              <stop stopColor="#fbad63" stopOpacity={0.3 + glow * 0.7} />
              <stop offset="1" stopColor="#ff8c47" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="115" cy="73" rx="90" ry="58" fill={`url(#heat-${kind})`} opacity={glow} />
          <path d="M15 75 H57 M173 75 H215" stroke="var(--wire)" strokeWidth="3" />
          <rect
            x="57"
            y="48"
            width="116"
            height="54"
            rx="12"
            fill="var(--surface-raised)"
            stroke="var(--border-strong)"
            strokeWidth="2"
          />
          <path
            d="M67 75 l8 -15 12 30 12 -30 12 30 12 -30 12 30 12 -30 12 30 7 -15"
            fill="none"
            stroke="#f3a261"
            strokeWidth="4"
            style={{ filter: `drop-shadow(0 0 ${glow * 12}px #ff9345)`, opacity: 0.3 + glow * 0.7 }}
          />
          <text x="115" y="130" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
            R = {format(resistance, 0)} Ω
          </text>
        </svg>
        <div className="heater-power">
          {reading.value} <small>{reading.unit}</small>
        </div>
        <p>
          {format(voltage, 3)} V {kind === 'AC' ? 'rms' : 'DC'} · average heating
        </p>
      </div>
    );
  };
  return (
    <Panel
      title="Different currents. The same warmth."
      eyebrow="THE EQUIVALENT HEATING EXPERIMENT"
      className="heating-panel"
      actions={<Flame size={18} />}
    >
      <div className="heaters">
        {heater('AC', h.acPower, h.voltageRms)}
        <div
          role="img"
          className={`heating-equals ${h.matched ? 'matched' : ''}`}
          aria-label={h.matched ? 'Heating matches within tolerance' : 'Heating differs'}
        >
          {h.matched ? <Equal size={22} /> : <EqualNot size={22} />}
        </div>
        {heater('DC', h.dcPower, dcVoltage)}
      </div>
      <div className={`heating-feedback ${h.matched ? 'matched' : ''}`}>
        <span className="status-dot active" />
        <b>
          {h.matched ? 'Heating matched within 1%' : 'Adjust the DC source to match the AC heating'}
        </b>
        <span>
          ΔP = {h.difference >= 0 ? '+' : ''}
          {format(h.difference, 3)} W
        </span>
      </div>
      <p className="caption">
        Identical resistors. Glow represents calculated average power using the same bounded scale
        <Equation tex={String.raw`\frac{P}{P+20\;\mathrm W}`} />; no temperature or thermal-inertia
        model is implied.
      </p>
      <div className="heating-formula">
        <Equation tex={String.raw`P_{\mathrm{AC}}=\frac{V_{\mathrm{rms}}^2}{R}`} />
        <span>equal heating when</span>
        <Equation tex={String.raw`V_{\mathrm{DC}}=V_{\mathrm{rms}}=\frac{V_0}{\sqrt{2}}`} />
      </div>
    </Panel>
  );
}
