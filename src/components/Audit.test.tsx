import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Phasor } from './Phasor';
import { Parameter } from './UI';
import { Calculations } from './Calculations';
import { Heating } from './Heating';
import { atPhase, resonanceFrequency, solveCircuit } from '../physics/ac';
import type { CircuitMode } from '../physics/ac';
import { defaults } from '../model';
import { useClock } from '../hooks/useClock';
import { Challenges } from './Challenges';
function end(container: HTMLElement, id: string) {
  const path = container.querySelector(`[data-vector="${id}"] > path`)!;
  const numbers = path
    .getAttribute('d')!
    .match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)!
    .map(Number);
  return { x: numbers[2] - 135, y: 125 - numbers[3] };
}
describe('Audit of actual phasor SVG geometry', () => {
  it.each<CircuitMode>(['R', 'L', 'C', 'RL', 'RC', 'RLC'])(
    '%s vectors close, have the signed phase, and project consistently onto sine waveforms',
    (mode) => {
      const s = solveCircuit({ ...defaults.reactance, mode, frequency: 50 });
      const { container, rerender } = render(<Phasor solution={s} theta={0} />);
      const scale = 85 / Math.max(s.voltageRms, s.vr, s.vl, s.vc);
      for (const theta of [0.731, 2.137, 4.911]) {
        rerender(<Phasor solution={s} theta={theta} />);
        const source = end(container, 'VS'),
          current = end(container, 'I');
        const angle = Math.atan2(
          source.y * current.x - source.x * current.y,
          source.x * current.x + source.y * current.y,
        );
        expect(angle).toBeCloseTo(s.phase, 12);
        expect((source.y / scale) * Math.SQRT2).toBeCloseTo(atPhase(s, theta).voltage, 10);
        let sumX = 0,
          sumY = 0;
        for (const [id, quantity] of [
          ['VR', 'vr'],
          ['VL', 'vl'],
          ['VC', 'vc'],
        ] as const) {
          if (!container.querySelector(`[data-vector="${id}"]`)) continue;
          const vector = end(container, id);
          sumX += vector.x;
          sumY += vector.y;
          expect((vector.y / scale) * Math.SQRT2).toBeCloseTo(atPhase(s, theta)[quantity], 10);
        }
        expect(sumX).toBeCloseTo(source.x, 10);
        expect(sumY).toBeCloseTo(source.y, 10);
        const tail = container
          .querySelector('[data-testid="phasor-sum"]')!
          .getAttribute('d')!
          .match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)!
          .map(Number);
        expect(tail[tail.length - 2] - 135).toBeCloseTo(source.x, 10);
        expect(125 - tail[tail.length - 1]).toBeCloseTo(source.y, 10);
      }
      fireEvent.click(screen.getByRole('checkbox', { name: 'Rotate' }));
      expect(end(container, 'I').y).toBeCloseTo(0, 12);
      expect(Math.atan2(end(container, 'VS').y, end(container, 'VS').x)).toBeCloseTo(s.phase, 12);
    },
  );
  it('does not imply resistor or component voltages in independent-signal mode', () => {
    const { container } = render(
      <Phasor solution={solveCircuit({ ...defaults.waveforms, mode: 'R' })} theta={1} signalMode />,
    );
    expect(container.querySelector('[data-vector="VR"]')).toBeNull();
    expect(container.querySelector('[data-testid="phasor-sum"]')).toBeNull();
    expect(screen.getByText(/no component voltages are implied/)).toBeVisible();
  });
});
describe('Audit regressions for precision and teaching statements', () => {
  it('rejects a 10% reactance error and a zero answer for tiny positive power, while accepting actual values', () => {
    const p = { ...defaults.reactance, mode: 'L' as const, frequency: 1, inductance: 0.001 };
    const s = solveCircuit(p);
    const { rerender } = render(
      <Challenges
        lab="reactance"
        p={p}
        solution={s}
        theta={0}
        playing={false}
        onPrepare={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('Choose your challenge'), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Challenge answer' }), {
      target: { value: String(s.xl * 1.1) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'not been reached',
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Challenge answer' }), {
      target: { value: String(s.xl) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'meets the target',
    );
    const power = {
        ...defaults.power,
        mode: 'RC' as const,
        voltageRms: 1,
        frequency: 1,
        resistance: 200,
        capacitance: 1e-6,
      },
      model = solveCircuit(power);
    rerender(
      <Challenges
        key="power"
        lab="power"
        p={power}
        solution={model}
        theta={(90.1 * Math.PI) / 180}
        playing={false}
        onPrepare={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('Choose your challenge'), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Challenge answer' }), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'not been reached',
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Challenge answer' }), {
      target: { value: String(model.averagePower) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'meets the target',
    );
    fireEvent.change(screen.getByLabelText('Choose your challenge'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check my experiment' }));
    expect(screen.getByRole('status', { name: 'Challenge result' })).toHaveTextContent(
      'meets the target',
    );
  });
  it('does not quantize a full-precision value when an untouched numerical input loses focus', () => {
    const change = vi.fn(),
      frequency = resonanceFrequency(0.1, 100e-6);
    render(
      <Parameter
        label="Frequency"
        symbol="f"
        value={frequency}
        min={1}
        max={10000}
        step={0.1}
        unit="Hz"
        onChange={change}
      />,
    );
    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(change).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '40' } });
    expect(change).toHaveBeenCalledWith(40);
  });
  it.each<CircuitMode>(['L', 'C'])(
    'explicitly keeps the pure %s phase at 90 degrees when frequency changes',
    (mode) => {
      const p = { ...defaults.reactance, mode, frequency: 100 };
      render(<Calculations lab="reactance" p={p} solution={solveCircuit(p)} theta={1} />);
      expect(screen.getByText(/90° at every positive frequency/)).toBeVisible();
      expect(screen.queryByText(/increasing frequency increases this lag/)).not.toBeInTheDocument();
    },
  );
  it('does not label a low-power 20% heating mismatch as a 1% match', () => {
    render(<Heating peak={1} resistance={200} dcVoltage={Math.sqrt(0.6)} />);
    expect(screen.getByRole('img', { name: 'Heating differs' })).toBeVisible();
    expect(screen.queryByText('Heating matched within 1%')).not.toBeInTheDocument();
  });
  it('cancels its single animation loop on pause and unmount, and keeps scrub/replay deterministic', () => {
    let next = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.set(++next, cb);
      return next;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      callbacks.delete(id);
    });
    try {
      const { result, unmount } = renderHook(() => useClock());
      expect(callbacks.size).toBe(0);
      act(() => result.current.replay());
      expect(callbacks.size).toBe(1);
      for (const time of [100, 200])
        act(() => {
          const [id, callback] = [...callbacks.entries()][0];
          callbacks.delete(id);
          callback(time);
        });
      expect(result.current.theta).toBeGreaterThan(0);
      act(() => result.current.setPlaying(false));
      expect(callbacks.size).toBe(0);
      act(() => result.current.scrub(0.25));
      expect(result.current.theta).toBeCloseTo(Math.PI / 2, 12);
      act(() => result.current.replay());
      expect(result.current.theta).toBe(0);
      expect(callbacks.size).toBe(1);
      unmount();
      expect(callbacks.size).toBe(0);
      expect(cancel).toHaveBeenCalled();
    } finally {
      request.mockRestore();
      cancel.mockRestore();
    }
  });
});
