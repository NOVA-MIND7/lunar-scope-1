import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  ['/', 'Mission Control'], ['/explorer', 'Lunar Explorer'], ['/navigator', 'Landing Navigator'],
  ['/solar', 'Solar Analysis'], ['/earth', 'Earth Visibility'], ['/timeline', 'Mission Timeline'],
  ['/compare', 'Site Comparison'], ['/terrain', 'Terrain Analysis'], ['/recommendations', 'Recommendations'],
  ['/reports', 'Mission Reports'], ['/data-sources', 'Data Sources'], ['/settings', 'Settings'], ['/status', 'System Status'],
] as const;

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test('every route renders its heading without console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  for (const [path, title] of ROUTES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }
  // Failed /api calls (backend not running) are expected noise; anything else is a real error.
  expect(errors.filter((e) => !/\/api\/|Failed to load resource|ERR_|net::/.test(e))).toEqual([]);
});

test('sidebar links navigate and highlight the active route', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const [path, title] of ROUTES.filter(([p]) => !['/', '/data-sources', '/settings', '/status'].includes(p))) {
    await nav.getByRole('link', { name: title }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(nav.getByRole('link', { name: title })).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('navigation', { name: 'Secondary' }).getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('science modules do not show invented results', async ({ page }) => {
  await page.goto('/solar');
  await expect(page.getByTestId('not-implemented')).toBeVisible();
});
