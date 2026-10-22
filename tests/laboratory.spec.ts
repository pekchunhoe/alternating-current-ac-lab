import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
const names = ['AC Waveforms', 'RMS Values', 'Reactance & Impedance', 'Power & Power Factor'];
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause simulation' }).click();
});
test('all laboratories render in both themes without overflow or invalid labels', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
    for (let k = 0; k < names.length; k++) {
      await page.getByRole('tab', { name: names[k], exact: true }).click();
      const pause = page.getByRole('button', { name: 'Pause simulation' });
      if (await pause.count()) await pause.click();
      if (k === 2)
        await page
          .getByRole('combobox', { name: 'Experiment preset' })
          .selectOption('Exact Resonance');
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await expect(page.getByText('Live Calculations', { exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect(await page.title()).toBe('Alternating Current Lab');
      const visible = await page.locator('body').innerText();
      expect(visible).not.toMatch(/Semester|Chapter|Subtopic|Topic\s+\d|NaN|Infinity/);
      expect(await page.locator('.katex-error').count()).toBe(0);
      await page.evaluate(() => document.fonts.ready);
      const overflowingMath = await page
        .locator('.equation')
        .evaluateAll((elements) =>
          elements
            .filter((element) => element.scrollWidth > element.clientWidth + 2)
            .map((element) => element.querySelector('annotation')?.textContent),
        );
      expect(overflowingMath).toEqual([]);
      const clippedTicks = await page.locator('.chart .axis-text').evaluateAll((elements) =>
        elements.flatMap((element) => {
          const text = element.getBoundingClientRect();
          const panel = element.closest('.panel')!.getBoundingClientRect();
          return text.left < panel.left + 1 || text.right > panel.right - 1
            ? [element.textContent]
            : [];
        }),
      );
      expect(clippedTicks).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `screenshots/${info.project.name}-${theme}-${k === 0 ? 'waveforms' : k === 1 ? 'rms' : k === 2 ? 'resonance' : 'power'}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `screenshots/${info.project.name}-${theme}-${k === 0 ? 'waveforms' : k === 1 ? 'rms' : k === 2 ? 'resonance' : 'power'}-viewport.png`,
      });
    }
  }
  expect(errors).toEqual([]);
});
test('source controls, phase scrubbing, reversing current, frequency and reset are connected', async ({
  page,
}) => {
  const peak = page.getByRole('spinbutton', { name: 'Peak voltage', exact: true });
  await peak.fill('20');
  await peak.press('Tab');
  await expect(page.getByRole('slider', { name: 'Peak voltage slider' })).toHaveValue('20');
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('90');
  await expect(page.getByTestId('current-direction')).toHaveAttribute('data-direction', 'forward');
  await expect(page.getByTestId('current-direction')).toHaveAttribute('d', 'M388 151 l10 -5 v10 z');
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'meets the target',
  );
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('270');
  await expect(page.getByTestId('current-direction')).toHaveAttribute('data-direction', 'reverse');
  await expect(page.getByTestId('current-direction')).toHaveAttribute(
    'd',
    'M398 151 l-10 -5 v10 z',
  );
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).fill('100');
  await expect(page.getByText('10.000 ms', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await expect(peak).toHaveValue('12');
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeVisible();
});
test('play, pause, replay and visual slow motion preserve physical frequency', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0.25');
  await expect(page.getByRole('spinbutton', { name: 'Frequency', exact: true })).toHaveValue('50');
  await page.getByRole('button', { name: 'Replay simulation' }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeVisible();
  await expect
    .poll(async () =>
      Number(await page.getByRole('slider', { name: 'Cycle phase', exact: true }).inputValue()),
    )
    .toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const phase = await page.getByRole('slider', { name: 'Cycle phase', exact: true }).inputValue();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  expect(await page.getByRole('slider', { name: 'Cycle phase', exact: true }).inputValue()).toBe(
    phase,
  );
  await expect(page.getByRole('spinbutton', { name: 'Frequency', exact: true })).toHaveValue('50');
});
test('RMS matching is calculated and challenge feedback respects tolerance', async ({ page }) => {
  await page.getByRole('tab', { name: 'RMS Values', exact: true }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'not been reached',
  );
  await page
    .getByRole('spinbutton', { name: 'DC comparison voltage', exact: true })
    .fill('7.071067812');
  await page.getByRole('spinbutton', { name: 'DC comparison voltage', exact: true }).press('Tab');
  await expect(page.getByText('Heating matched within 1%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'meets the target',
  );
});
test('every circuit mode recalculates phase, components, phasors and resonance', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Reactance & Impedance', exact: true }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  for (const [mode, angle] of [
    ['R', '0.00°'],
    ['L', '90.00°'],
    ['C', '-90.00°'],
    ['RL', null],
    ['RC', null],
    ['RLC', null],
  ]) {
    await page.getByRole('button', { name: mode!, exact: true }).click();
    await expect(
      page.getByRole('img', { name: new RegExp(`^${mode} series circuit`) }),
    ).toBeVisible();
    if (angle) await expect(page.locator('.reading-rows')).toContainText(angle);
    expect(await page.getByRole('spinbutton', { name: 'Inductance', exact: true }).count()).toBe(
      mode!.includes('L') ? 1 : 0,
    );
    expect(await page.getByRole('spinbutton', { name: 'Capacitance', exact: true }).count()).toBe(
      mode!.includes('C') ? 1 : 0,
    );
  }
  await page.getByRole('combobox', { name: 'Experiment preset' }).selectOption('Exact Resonance');
  await expect(page.getByRole('spinbutton', { name: 'Frequency', exact: true })).toHaveValue(
    '50.329212',
  );
  await expect(page.locator('.reading-status')).toHaveText('At resonance');
  await page.getByRole('spinbutton', { name: 'Resistance', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Inductance', exact: true }).fill('2000');
  await page.getByRole('spinbutton', { name: 'Capacitance', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Capacitance', exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Tune to resonance' }).click();
  await expect(page.locator('.metrics-grid')).toContainText('12.000');
  await page.getByRole('combobox', { name: 'Frequency response graph' }).selectOption('current');
  expect(
    Number(await page.locator('.resonance-panel .chart circle').getAttribute('cy')),
  ).toBeCloseTo(69.8, 3);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'screenshots/high-q-resonance.png', fullPage: true });
  await page.getByRole('combobox', { name: 'Experiment preset' }).selectOption('Exact Resonance');
  await expect(page.locator('.metrics-grid')).toContainText('0.600');
  await page.getByLabel('Component voltage traces', { exact: true }).check();
  await expect(page.locator('.component-legend')).toContainText('V\u1d63');
  await page.getByLabel('Rotate', { exact: true }).uncheck();
  await expect(page.getByRole('img', { name: /Current reference frame/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Frequency response graph' }).selectOption('current');
  await expect(page.getByRole('img', { name: /I rms \/ A against Frequency/ })).toBeVisible();
  const graph = page.getByRole('img', { name: /I rms \/ A against Frequency/ });
  const box = (await graph.boundingBox())!;
  await graph.click({ position: { x: box.width * 0.7, y: box.height * 0.5 } });
  expect(
    Number(await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).inputValue()),
  ).not.toBeCloseTo(50.329212, 3);
  await page.getByRole('button', { name: 'Tune to resonance' }).click();
  await expect(page.locator('.reading-status')).toHaveText('At resonance');
});
test('series compensation improves power factor and real power is updated', async ({ page }) => {
  await page.getByRole('tab', { name: 'Power & Power Factor', exact: true }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.getByRole('button', { name: 'Set up series compensation' }).click();
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'not been reached',
  );
  await page.getByRole('spinbutton', { name: 'Capacitance', exact: true }).fill('101.3211836');
  await page.getByRole('spinbutton', { name: 'Capacitance', exact: true }).press('Tab');
  await expect(page.getByRole('img', { name: 'Power factor 1.0000' })).toBeVisible();
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'meets the target',
  );
  await expect(page.locator('.reading-rows')).toContainText('7.200 W');
});
test('invalid input is explained; keyboard navigation and reduced motion work', async ({
  page,
}) => {
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).fill('0');
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).press('Tab');
  await expect(page.getByRole('alert')).toContainText('Enter 1');
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Frequency', exact: true })).toHaveValue('50');
  await page.getByRole('tab', { name: 'AC Waveforms', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'RMS Values', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lab guide' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('tablet layout stays within the viewport on all four laboratories', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const name of names) {
    await page.getByRole('tab', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: 'screenshots/tablet-power.png', fullPage: true });
});
test('low and high frequencies keep correct axes; trace visibility and independent CSV work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).press('Tab');
  await page.getByRole('combobox', { name: 'Time window' }).selectOption('20');
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('90');
  await expect(page.getByRole('img', { name: /v \/ V against Time/ })).toContainText('250.0');
  await expect(page.locator('.reading-rows')).toContainText('250.000 ms');
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).fill('10000');
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).press('Tab');
  await page.getByRole('combobox', { name: 'Time window' }).selectOption('-2');
  await expect
    .poll(async () =>
      (
        await page
          .getByRole('img', { name: /v \/ V against Time/ })
          .locator('.axis-text')
          .allTextContents()
      ).map(Number),
    )
    .toEqual(expect.arrayContaining([0, 0.05, 0.1, 0.15, 0.2]));
  const voltage = page
    .locator('.trace-legend label')
    .filter({ hasText: 'Voltage' })
    .getByRole('checkbox');
  const current = page
    .locator('.trace-legend label')
    .filter({ hasText: 'Current' })
    .getByRole('checkbox');
  await voltage.uncheck();
  await current.uncheck();
  await expect(page.getByText('Enable a trace to view the signal.')).toBeVisible();
  await voltage.check();
  await current.check();
  await page.getByRole('combobox', { name: 'Exploration mode' }).selectOption('signals');
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).fill('50');
  await page.getByRole('spinbutton', { name: 'Peak current', exact: true }).fill('0.5');
  await page.getByRole('spinbutton', { name: 'Peak current', exact: true }).press('Tab');
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('90');
  await expect(page.locator('.metrics-grid')).toContainText('0.500');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download graph CSV' }).click();
  const download = await downloading;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv.split('\n')[0]).toContain('signal_product_VA');
  const rows = csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(',').map(Number));
  expect(rows.length).toBeGreaterThanOrEqual(801);
  for (const [, v, i, product] of rows) expect(product).toBeCloseTo(v * i, 10);
  expect(Math.max(...rows.map((row) => row[2]))).toBeCloseTo(0.5, 6);
  await page.getByRole('button', { name: 'Fullscreen graph' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Fullscreen graph' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  expect(errors).toEqual([]);
});
test('all laboratories pass automated accessibility checks in both themes', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
    for (const name of names) {
      await page.getByRole('tab', { name, exact: true }).click();
      const pause = page.getByRole('button', { name: 'Pause simulation' });
      if (await pause.count()) await pause.click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      await info.attach(`accessibility-${theme}-${name}`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });
      expect(
        results.violations.map((v) => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  }
});
