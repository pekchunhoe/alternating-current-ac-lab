import { useEffect, useState, useCallback } from 'react';
import { advancePhase, TAU } from '../physics/ac';
export function useClock() {
  const [theta, setTheta] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      previous = 0,
      lastDraw = 0;
    function tick(now: number) {
      if (!previous) previous = now;
      // Bound rendering to 30 fps; background tabs do not jump on return.
      if (now - lastDraw >= 1000 / 30) {
        const elapsed = Math.min((now - previous) / 1000, 0.15);
        setTheta((t) => advancePhase(t, elapsed, speed));
        previous = now;
        lastDraw = now;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (query.matches) setPlaying(false);
    };
    query.addEventListener('change', reduce);
    return () => query.removeEventListener('change', reduce);
  }, []);
  const scrub = useCallback((value: number) => {
    setPlaying(false);
    setTheta(value * TAU);
  }, []);
  const replay = useCallback(() => {
    setTheta(0);
    setPlaying(true);
  }, []);
  const reset = useCallback(() => {
    setTheta(0);
    setPlaying(false);
    setSpeed(1);
  }, []);
  return { theta, playing, setPlaying, speed, setSpeed, scrub, replay, reset };
}
