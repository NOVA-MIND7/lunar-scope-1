import { expect, test, type Page } from '@playwright/test';

/**
 * WebGL end-to-end checks for the 3D Lunar Explorer. These need a WebGL context; on GPU-less machines run with
 * PLAYWRIGHT_SOFTWARE_GL=1 (software rendering, slow to start).
 */
test.describe.configure({ mode: 'serial' });

// React 19 dev + StrictMode double-invokes R3F Canvas cleanup and logs this; it does not occur in production builds.
const KNOWN_DEV_NOISE = /synchronously unmount a root|\/api\/|Failed to load resource|ERR_|net::/;

let page: Page;
const errors: string[] = [];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto('/explorer');
  await expect(page.getByTestId('lunar-globe')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
});
test.afterAll(async () => page.close());

const probe = () => page.getByTestId('camera-probe');
const num = async (attr: string) => Number(await probe().getAttribute(attr));
const canvasBox = async () => (await page.locator('canvas').boundingBox())!;

test('renders a WebGL canvas with the surface labelled', async () => {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('lunar-globe')).toHaveAttribute('data-webgl', 'true');
  await expect(page.getByTestId('surface-credit')).toContainText(/Not NASA data|NASA/);
});

test('drag rotates, wheel zooms, right-drag pans', async () => {
  const b = await canvasBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const lon0 = await num('data-center-lon');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 160, cy, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await num('data-center-lon')) - lon0)).toBeGreaterThan(5);

  const d0 = await num('data-distance');
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -600);
  await expect.poll(() => num('data-distance')).toBeLessThan(d0);

  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx + 80, cy + 40, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => num('data-pan')).toBeGreaterThan(0);
});

test('reset restores the default view', async () => {
  await page.getByRole('button', { name: 'Reset view' }).first().click();
  await expect.poll(() => num('data-distance'), { timeout: 25_000 }).toBeCloseTo(3.4, 1);
  await expect.poll(() => num('data-pan')).toBeCloseTo(0, 2);
});

test('clicking the globe picks a location that is confirmed into the global store', async () => {
  const b = await canvasBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  const picked = page.getByTestId('picked-coordinates');
  await expect(picked).toBeVisible();
  await expect(page.getByTestId('pending-bar')).toBeVisible();
  await page.getByRole('button', { name: /SELECT THIS LOCATION/i }).click();
  await expect(page.getByTestId('site-info')).toContainText('Custom location');
  await expect(page.getByTestId('topbar-location')).toContainText('Custom location');
});

test('typed coordinates give the same canonical result as a click', async () => {
  await page.getByLabel('Latitude (°)').fill('-89.5');
  await page.getByLabel('Longitude (°E)').fill('-180');
  await page.getByRole('button', { name: 'Locate on Moon' }).click();
  await expect(page.getByTestId('picked-coordinates')).toContainText('89.50° S');
  await expect(page.getByTestId('picked-coordinates')).toContainText('180.00° E');
  await page.getByRole('button', { name: /SELECT THIS LOCATION/i }).click();
  await expect(page.getByTestId('site-info')).toContainText('Custom location');
});

test('invalid coordinates are rejected', async () => {
  await page.getByLabel('Latitude (°)').fill('120');
  await page.getByLabel('Longitude (°E)').fill('0');
  await page.getByRole('button', { name: 'Locate on Moon' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Latitude must be' })).toBeVisible();
});

test('South Pole mode moves the camera to the pole, labels the region, and exits cleanly', async () => {
  await page.getByRole('button', { name: 'EXPLORE LUNAR SOUTH POLE' }).click();
  await expect.poll(() => num('data-center-lat'), { timeout: 25_000 }).toBeLessThan(-70);
  await expect(page.getByTestId('south-pole-note')).toContainText(/varies strongly/i);
  await page.getByRole('button', { name: 'EXIT SOUTH POLE MODE' }).click();
  await expect.poll(() => num('data-center-lat'), { timeout: 25_000 }).toBeGreaterThan(0);
});

test('no unexpected console errors', async () => {
  expect(errors.filter((e) => !KNOWN_DEV_NOISE.test(e))).toEqual([]);
});
