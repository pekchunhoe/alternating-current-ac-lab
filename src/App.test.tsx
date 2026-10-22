import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { Parameter } from './components/UI';
import { useState } from 'react';
import { applyPreset, defaults } from './model';
import { resonanceStatus, solveCircuit } from './physics/ac';
describe('Connected laboratory controls', () => {
  it('loads all four laboratories and supports keyboard tab navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const name of [
      'RMS Values',
      'Reactance & Impedance',
      'Power & Power Factor',
      'AC Waveforms',
    ]) {
      await user.click(screen.getByRole('tab', { name }));
      expect(screen.getByRole('tabpanel')).toBeVisible();
      expect(screen.getByText('Live Calculations')).toBeVisible();
    }
    screen.getByRole('tab', { name: 'AC Waveforms' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'RMS Values' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
  it('connects numerical controls, sliders, reset, and playback', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peak voltage' }), {
      target: { value: '20' },
    });
    expect(screen.getByRole('slider', { name: 'Peak voltage slider' })).toHaveValue('20');
    await user.click(screen.getByRole('button', { name: 'Reset experiment' }));
    expect(screen.getByRole('spinbutton', { name: 'Peak voltage' })).toHaveValue(12);
    expect(screen.getByRole('button', { name: 'Play simulation' })).toBeVisible();
    fireEvent.change(screen.getByRole('slider', { name: 'Cycle phase' }), {
      target: { value: '90' },
    });
    expect(screen.getByRole('slider', { name: 'Cycle phase' })).toHaveValue('90');
    await user.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'meets the target',
    );
  });
  it('changes actual circuit modes and exact-resonance parameters', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Reactance & Impedance' }));
    await user.click(screen.getByRole('button', { name: 'C' }));
    expect(screen.queryByRole('spinbutton', { name: 'Inductance' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Capacitance' })).toBeVisible();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Experiment preset' }),
      'Exact Resonance',
    );
    expect(screen.getByRole('spinbutton', { name: 'Frequency' })).toHaveValue(50.329212);
    expect(screen.getAllByText('At resonance').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'meets the target',
    );
  });
  it('checks heating equality and retains each experiment state across tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'RMS Values' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peak voltage' }), {
      target: { value: '20' },
    });
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Experiment preset' }),
      'Equal Heating',
    );
    await user.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'meets the target',
    );
    await user.click(screen.getByRole('tab', { name: 'AC Waveforms' }));
    expect(screen.getByRole('spinbutton', { name: 'Peak voltage' })).toHaveValue(12);
    await user.click(screen.getByRole('tab', { name: 'RMS Values' }));
    expect(screen.getByRole('spinbutton', { name: 'Peak voltage' })).toHaveValue(20);
  });
  it('validates numerical input instead of passing invalid physics to the model', () => {
    function Harness() {
      const [value, setValue] = useState(50);
      return (
        <Parameter
          label="Frequency"
          symbol="f"
          value={value}
          min={1}
          max={500}
          step={1}
          unit="Hz"
          onChange={setValue}
        />
      );
    }
    render(<Harness />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter 1');
    expect(screen.getByRole('slider')).toHaveValue('50');
    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveValue('60');
  });
  it('toggles theme and offers a genuine independent-signal mode', async () => {
    const user = userEvent.setup();
    render(<App />);
    const button = screen.getByRole('button', { name: /Switch to .* theme/ });
    await user.click(button);
    expect(document.documentElement.dataset.theme).toMatch(/light|dark/);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Exploration mode' }), 'signals');
    expect(screen.getByRole('spinbutton', { name: 'Peak current' })).toBeVisible();
    expect(screen.queryByRole('spinbutton', { name: 'Resistance' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('tabpanel')).getByText(/No physical load is connected/),
    ).toBeVisible();
  });
  it('presets consistently derive their actual physics', () => {
    const p = applyPreset(defaults.reactance, 'Exact Resonance');
    const s = solveCircuit(p);
    expect(resonanceStatus(s)).toBe('At resonance');
    expect(s.z).toBe(20);
    expect(s.currentRms).toBeCloseTo(0.6, 10);
    expect(solveCircuit(applyPreset(p, 'Current Leads')).phase).toBeLessThan(0);
    expect(solveCircuit(applyPreset(p, 'Current Lags')).phase).toBeGreaterThan(0);
  });
});
