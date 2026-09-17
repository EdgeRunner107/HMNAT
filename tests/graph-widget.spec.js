import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const sample = {
  ok: true,
  login_id: 'testuser',
  toonAmount: 11900,
  dbAmount: 50000,
  totalAmount: 61900,
  goalAmount: 100000,
  percent: 61.9,
  toonUpdatedAt: '2026-09-16T00:00:00Z',
  isToonStale: false,
};

test('personal graph polls one user endpoint every ten seconds and retains valid data on failures', async ({
  page,
}) => {
  let mode = 'initial';
  let requests = 0;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.route('**/api/u/testuser/goal-progress', (route) => {
    requests += 1;
    expect(route.request().method()).toBe('GET');
    expect(new URL(route.request().url()).search).toBe('');
    if (mode === 'error') return route.fulfill({ status: 500, json: { ok: false } });
    if (mode === 'invalid') return route.fulfill({ json: { ok: true, totalAmount: 0 } });
    if (mode === 'wrong-user')
      return route.fulfill({ json: { ...sample, login_id: 'user2', totalAmount: 1 } });
    const data =
      mode === 'next'
        ? {
            ...sample,
            toonAmount: 60000,
            dbAmount: 60000,
            totalAmount: 120000,
            goalAmount: 1000000,
            percent: 12,
          }
        : { ...sample, isToonStale: mode === 'stale' };
    return route.fulfill({ json: data });
  });
  await page.goto('/widget/graph/testuser');
  await expect(page.locator('.graph-widget-value')).toHaveText('61,900 (61.9%)');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '61.9');
  for (const selector of ['html', 'body', '#root']) {
    await expect(page.locator(selector)).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect(page.locator(selector)).toHaveCSS('overflow', 'hidden');
  }
  await expect(page.locator('.sidebar, .topbar, .ranking-widget, button')).toHaveCount(0);
  for (const nextMode of ['initial', 'stale', 'error', 'invalid', 'wrong-user']) {
    mode = nextMode;
    const before = requests;
    await page.clock.fastForward(10_100);
    await expect.poll(() => requests).toBeGreaterThan(before);
    await expect(page.locator('.graph-widget-value')).toHaveText('61,900 (61.9%)');
  }
  mode = 'next';
  await page.clock.fastForward(10_100);
  await expect(page.locator('.graph-widget-value')).toHaveText('120,000 (12.0%)');
  expect(errors).toEqual([]);
});

test('graph caps only bar width, stays compact at OBS/mobile sizes and restores admin styles', async ({
  page,
}) => {
  await page.route('**/api/u/testuser/goal-progress', (route) =>
    route.fulfill({
      json: {
        ...sample,
        dbAmount: 10500000,
        toonAmount: 0,
        totalAmount: 10500000,
        goalAmount: 10000000,
        percent: 105,
      },
    }),
  );
  for (const width of [720, 320, 240]) {
    await page.setViewportSize({ width, height: 100 });
    await page.goto('/widget/graph/testuser');
    await expect(page.locator('.graph-widget-value')).toHaveText('10,500,000 (105.0%)');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    const panel = await page.locator('.graph-widget').boundingBox();
    const track = await page.locator('.graph-widget-track').boundingBox();
    await expect(page.locator('.graph-widget-fill')).toHaveCSS(
      'width',
      `${track.width}px`,
    );
    expect(panel.width).toBeLessThanOrEqual(width);
    expect(panel.height).toBeLessThanOrEqual(70);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(page.locator('.graph-widget-value')).toBeInViewport();
    await page.screenshot({
      path: `test-results/graph-widget-${width}.png`,
      omitBackground: true,
    });
  }
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/graph-widget-html/);
  await expect(page.locator('body')).not.toHaveClass(/graph-widget-body/);
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(244, 247, 252)');
});

test('dashboard keeps exactly the encoded personal ranking and graph links', async ({
  page,
}) => {
  const user = { id: 42, login_id: 'streamer+42', is_active: true, payment_date: null };
  await page.addInitScript(
    (value) => localStorage.setItem('hmnat_user', JSON.stringify(value)),
    user,
  );
  await page.route('**/api/donations?*', (route) =>
    route.fulfill({ json: { ok: true, donations: [] } }),
  );
  await page.goto('/');
  await expect(page.locator('#ranking-url')).toHaveValue(
    'https://hmnat-livid.vercel.app/widget/ranking/streamer%2B42',
  );
  await expect(page.locator('#graph-url')).toHaveValue(
    'https://hmnat-livid.vercel.app/widget/graph/streamer%2B42',
  );
  await expect(page.locator('#goal-url')).toHaveCount(0);
  await expect(page.locator('.url-card')).toHaveCount(2);
  await expect(page.getByText('추후 업데이트', { exact: true })).toHaveCount(0);
});

test('an initial failure shows a placeholder and recovers on the next poll', async ({
  page,
}) => {
  let fail = true;
  await page.clock.install();
  await page.route('**/api/u/testuser/goal-progress', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { ok: false } })
      : route.fulfill({ json: sample }),
  );
  await page.goto('/widget/graph/testuser');
  await expect(page.locator('.graph-widget-value')).toHaveText('—');
  fail = false;
  await page.clock.fastForward(10_100);
  await expect(page.locator('.graph-widget-value')).toHaveText('61,900 (61.9%)');
});

test('URL users including encoded IDs get separate amounts and no extra aggregate requests', async ({
  page,
}) => {
  const requests = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    expect(url.pathname).toMatch(/^\/api\/u\/[^/]+\/goal-progress$/);
    const loginId = decodeURIComponent(url.pathname.split('/')[3]);
    requests.push(loginId);
    return route.fulfill({
      json:
        loginId === 'testuser'
          ? sample
          : {
              ...sample,
              login_id: loginId,
              dbAmount: 9000,
              toonAmount: 25000,
              totalAmount: 34000,
              percent: 34,
            },
    });
  });
  await page.goto('/widget/graph/testuser');
  await expect(page.locator('.graph-widget-value')).toHaveText('61,900 (61.9%)');
  const otherId = '방송+one/%';
  await page.goto(`/widget/graph/${encodeURIComponent(otherId)}/`);
  await expect(page.locator('.graph-widget-value')).toHaveText('34,000 (34.0%)');
  expect(requests).toContain('testuser');
  expect(requests).toContain(otherId);
});

test('removed global URL has no widget and malformed graph IDs never request the API', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/**', (route) => {
    requests += 1;
    return route.fulfill({ status: 404, json: { ok: false } });
  });
  await page.goto('/widget/goal');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  await expect(page.locator('.graph-widget, .goal-widget')).toHaveCount(0);
  await page.goto('/widget/graph/%20');
  await expect(page.locator('.graph-widget-value')).toHaveText('—');
  expect(requests).toBe(0);
});

test('Vercel rewrites route both personal widgets to the application', () => {
  const config = JSON.parse(
    readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
  );
  for (const source of ['/widget/ranking/:login_id', '/widget/graph/:login_id']) {
    expect(config.rewrites).toContainEqual({ source, destination: '/index.html' });
  }
  expect(config.rewrites.some((rule) => rule.source === '/widget/goal')).toBe(false);
});
