import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause simulation' }).click();
});
async function pause(page: Page) {
  const button = page.getByRole('button', { name: 'Pause simulation' });
  if (await button.count()) await button.click();
}
async function parameter(page: Page, name: string, value: string) {
  const field = page.getByRole('spinbutton', { name, exact: true });
  await field.fill(value);
  await field.press('Tab');
}
async function endpoint(svg: Locator, id: string) {
  const path = await svg.locator(`[data-vector="${id}"] > path`).first().getAttribute('d');
  const a = path!.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)!.map(Number);
  return { x: a[2] - 135, y: 125 - a[3] };
}
async function cursor(scope: Locator, quantity: string) {
  return Number(
    await scope.locator(`circle[data-series="${quantity}"]`).getAttribute('data-value'),
  );
}
async function noClippedMath(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const overflows = await page
    .locator('.equation')
    .evaluateAll((elements) =>
      elements
        .filter((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2)
        .map((e) => e.querySelector('annotation')?.textContent),
    );
  expect(overflows).toEqual([]);
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
}
test('curriculum definitions are explicit and all expanded learning content avoids forbidden labels', async ({
  page,
}) => {
  await expect(
    page.getByText(/Alternating current changes magnitude and periodically reverses direction/),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'RMS Values', exact: true }).click();
  await pause(page);
  await expect(page.getByText(/RMS current is the DC current/)).toBeVisible();
  await page.getByText('Why root mean square?', { exact: true }).click();
  await noClippedMath(page);
  await page.getByRole('tab', { name: 'Reactance & Impedance', exact: true }).click();
  await pause(page);
  await page.getByText('What resistance, reactance and impedance mean', { exact: true }).click();
  await expect(page.getByText(/Capacitive reactance is opposition to AC/)).toBeVisible();
  await page.getByText('Inspect component voltages and Kirchhoff’s law', { exact: true }).click();
  await noClippedMath(page);
  for (const tab of [
    'AC Waveforms',
    'RMS Values',
    'Reactance & Impedance',
    'Power & Power Factor',
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await pause(page);
    const visible = await page.locator('body').innerText();
    expect(visible).not.toMatch(/semester|syllabus|chapter|\bSP\d{3}\b|(?:subtopic|topic)\s*\d/i);
    await noClippedMath(page);
  }
  await page.getByRole('button', { name: 'Lab guide', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toContainText(
    /semester|syllabus|chapter|\bSP\d{3}\b|(?:subtopic|topic)\s*\d/i,
  );
  await noClippedMath(page);
});
test('all six physical circuits synchronize exact cursors, component sums, phasor phases and current direction', async ({
  page,
}, info) => {
  await page.getByRole('tab', { name: 'Reactance & Impedance', exact: true }).click();
  await pause(page);
  await parameter(page, 'Frequency', '50');
  await page.getByLabel('Component voltage traces', { exact: true }).check();
  const theta = (37.2 * Math.PI) / 180;
  for (const mode of ['R', 'L', 'C', 'RL', 'RC', 'RLC']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('37.2');
    const r = mode.includes('R') ? 20 : 0,
      xl = mode.includes('L') ? 2 * Math.PI * 50 * 0.1 : 0,
      xc = mode.includes('C') ? 1 / (2 * Math.PI * 50 * 100e-6) : 0;
    const phase = Math.atan2(xl - xc, r),
      irms = 12 / Math.hypot(r, xl - xc),
      v = 12 * Math.SQRT2 * Math.sin(theta),
      i = irms * Math.SQRT2 * Math.sin(theta - phase);
    const scope = page.locator('.scope-panel').first();
    expect(await cursor(scope, 'voltage')).toBeCloseTo(v, 10);
    expect(await cursor(scope, 'current')).toBeCloseTo(i, 10);
    let sum = 0;
    for (const [quantity, active] of [
      ['vr', mode.includes('R')],
      ['vl', mode.includes('L')],
      ['vc', mode.includes('C')],
    ] as const)
      if (active) sum += await cursor(scope, quantity);
    expect(sum).toBeCloseTo(v, 9);
    const svg = page.locator('.phasor-svg'),
      vs = await endpoint(svg, 'VS'),
      ip = await endpoint(svg, 'I');
    expect(Math.atan2(vs.y * ip.x - vs.x * ip.y, vs.x * ip.x + vs.y * ip.y)).toBeCloseTo(phase, 10);
    const scale = 85 / Math.max(12, irms * r, irms * xl, irms * xc);
    expect((vs.y / scale) * Math.SQRT2).toBeCloseTo(v, 9);
    await expect(page.getByTestId('current-direction')).toHaveAttribute(
      'data-direction',
      i > 0 ? 'forward' : 'reverse',
    );
    await expect(page.locator('.component-legend')).toContainText(
      mode.includes('L') ? 'Vₗ' : mode.includes('C') ? 'V꜀' : 'Vᵣ',
    );
    if (mode === 'L')
      await expect(page.locator('.interpretation')).toContainText(
        '90° at every positive frequency',
      );
    await page
      .locator('.phasor-panel')
      .screenshot({ path: `audit/screenshots/${info.project.name}-phasor-${mode}.png` });
  }
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('133.7');
  const expected = 12 * Math.SQRT2 * Math.sin((133.7 * Math.PI) / 180);
  expect(await cursor(page.locator('.scope-panel').first(), 'voltage')).toBeCloseTo(expected, 10);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `audit/screenshots/${info.project.name}-rlc-component-traces.png`,
    fullPage: true,
  });
});
test('frequency selection respects the rendered SVG transform and supports dragging', async ({
  page,
}, info) => {
  await page.getByRole('tab', { name: 'Reactance & Impedance', exact: true }).click();
  await pause(page);
  const graph = page.locator('.resonance-panel .chart');
  await graph.scrollIntoViewIfNeeded();
  const point = async (fraction: number) =>
    graph.evaluate((element, f) => {
      const svg = element as SVGSVGElement,
        p = svg.createSVGPoint();
      p.x = 62 + 596 * f;
      p.y = 120;
      const result = p.matrixTransform(svg.getScreenCTM()!);
      return { x: result.x, y: result.y };
    }, fraction);
  const start = await point(0.25),
    finish = await point(0.75),
    f0 = 1 / (2 * Math.PI * Math.sqrt(0.1 * 100e-6));
  if (info.project.name === 'mobile') await page.touchscreen.tap(start.x, start.y);
  else await page.mouse.click(start.x, start.y);
  expect(
    Number(await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).inputValue()),
  ).toBeCloseTo(f0 / Math.sqrt(5), 4);
  const scroll = await page.evaluate(() => scrollY);
  if (info.project.name === 'mobile') {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y }],
    });
    for (let k = 1; k <= 5; k++)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x + ((finish.x - start.x) * k) / 5, y: finish.y }],
      });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(finish.x, finish.y, { steps: 5 });
    await page.mouse.up();
  }
  expect(
    Number(await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).inputValue()),
  ).toBeCloseTo(f0 * Math.sqrt(5), 4);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
});
test('milliwatt equal-heating feedback keeps its advertised one-percent tolerance', async ({
  page,
}, info) => {
  await page.getByRole('tab', { name: 'RMS Values', exact: true }).click();
  await pause(page);
  await parameter(page, 'Peak voltage', '1');
  await parameter(page, 'Resistance', '200');
  await parameter(page, 'DC comparison voltage', String(Math.sqrt(0.6)));
  await expect(page.locator('.heater-power').first()).toHaveText('2.50 mW');
  await expect(page.locator('.heater-power').last()).toHaveText('3.00 mW');
  await expect(page.locator('.metrics-grid')).toContainText('mW');
  const tickValues = await page
    .locator('.scope-panel')
    .first()
    .locator('.axis-text')
    .allTextContents();
  expect(tickValues.map(Number)).toEqual(expect.arrayContaining([0.005, 0.0025, -0.0025, -0.005]));
  await expect(page.getByRole('img', { name: 'Heating differs', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'not been reached',
  );
  await parameter(page, 'DC comparison voltage', String(1 / Math.sqrt(2)));
  await expect(page.getByText('Heating matched within 1%', { exact: true })).toBeVisible();
  await expect(page.locator('.heater-power').last()).toHaveText('2.50 mW');
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'meets the target',
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `audit/screenshots/${info.project.name}-low-power-rms.png`,
    fullPage: true,
  });
});
test('small power substitutions use genuine scientific notation and extreme meters remain readable', async ({
  page,
}, info) => {
  await page.getByRole('tab', { name: 'Power & Power Factor', exact: true }).click();
  await pause(page);
  await page.getByRole('button', { name: 'RC', exact: true }).click();
  for (const [name, value] of [
    ['Source RMS voltage', '1'],
    ['Frequency', '1'],
    ['Resistance', '200'],
    ['Capacitance', '1'],
  ])
    await parameter(page, name, value);
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('90.1');
  await expect(page.getByTestId('current-direction')).toHaveAttribute('data-direction', 'reverse');
  await expect(page.locator('.circuit-svg')).toContainText('nA');
  await expect(page.locator('.circuit-panel')).not.toContainText('zero crossing');
  expect(await page.locator('body').innerText()).not.toMatch(/\d(?:\.\d+)?e[+-]\d/);
  const annotations = await page.locator('.calculations annotation').allTextContents();
  expect(annotations.some((tex) => tex.includes('\\times10^{-'))).toBe(true);
  expect(annotations.join('\n')).not.toMatch(/\d[eE][+-]\d/);
  await noClippedMath(page);
  await page
    .getByLabel('Choose your challenge', { exact: true })
    .selectOption({ label: 'Determine Average Power' });
  await page.getByRole('spinbutton', { name: 'Challenge answer' }).fill('0');
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'not been reached',
  );
  const impedance = Math.hypot(200, 1 / (2 * Math.PI * 1e-6)),
    expectedPower = 200 / impedance ** 2;
  await page.getByRole('spinbutton', { name: 'Challenge answer' }).fill(String(expectedPower));
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'meets the target',
  );
  await expect(page.locator('.challenge-result .katex')).toBeVisible();
  await noClippedMath(page);
  await page
    .getByLabel('Choose your challenge', { exact: true })
    .selectOption({ label: 'Inspect Instantaneous Power' });
  await page.getByRole('button', { name: 'Check my experiment' }).click();
  await expect(page.getByRole('status', { name: 'Challenge result' })).toContainText(
    'meets the target',
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `audit/screenshots/${info.project.name}-small-power-mathematics.png`,
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Reactance & Impedance', exact: true }).click();
  await pause(page);
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await parameter(page, 'Source RMS voltage', '100');
  await parameter(page, 'Frequency', '10000');
  await parameter(page, 'Capacitance', '2000');
  await expect(page.locator('.metrics-grid')).toContainText('12.566');
  await expect(page.locator('.metrics-grid')).toContainText('kA');
  await noClippedMath(page);
  await page.getByRole('button', { name: 'L', exact: true }).click();
  await parameter(page, 'Source RMS voltage', '1');
  await parameter(page, 'Inductance', '2000');
  await expect(page.locator('.metrics-grid')).toContainText('kΩ');
  await expect(page.locator('.metrics-grid')).toContainText('µA');
  const clipped = await page
    .locator('.metric-value')
    .evaluateAll((elements) =>
      elements.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
    );
  expect(clipped).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await noClippedMath(page);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `audit/screenshots/${info.project.name}-extreme-meters.png`,
    fullPage: true,
  });
});
test('untouched exact-resonance inputs retain full precision and independent signals omit phantom components', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Reactance & Impedance', exact: true }).click();
  await pause(page);
  await page.getByRole('combobox', { name: 'Experiment preset' }).selectOption('Exact Resonance');
  await page.getByRole('slider', { name: 'Cycle phase', exact: true }).fill('45');
  const current = page.locator('[data-vector="I"] > path').first(),
    before = await current.getAttribute('d');
  await page.getByRole('spinbutton', { name: 'Frequency', exact: true }).focus();
  await page.keyboard.press('Tab');
  expect(await current.getAttribute('d')).toBe(before);
  await page.getByRole('tab', { name: 'AC Waveforms', exact: true }).click();
  await pause(page);
  await page.getByRole('combobox', { name: 'Exploration mode' }).selectOption('signals');
  await expect(page.locator('[data-vector="VR"]')).toHaveCount(0);
  await expect(page.locator('[data-vector="VS"]')).toHaveCount(1);
});
