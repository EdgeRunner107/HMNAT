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

const settings = {
  ok: true,
  login_id: 'testuser',
  label: '경석이 모금액',
  color: '#31D663',
  isDefault: false,
};

test('graph polls goal and settings independently every ten seconds and retains valid values', async ({
  page,
}) => {
  let goalMode = 'initial';
  let settingsMode = 'initial';
  let goalRequests = 0;
  let settingsRequests = 0;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.route('**/api/u/testuser/goal-progress', (route) => {
    goalRequests += 1;
    expect(route.request().method()).toBe('GET');
    if (goalMode === 'error') {
      return route.fulfill({ status: 500, json: { ok: false } });
    }
    if (goalMode === 'invalid') {
      return route.fulfill({ json: { ok: true, totalAmount: 0 } });
    }
    if (goalMode === 'wrong-user') {
      return route.fulfill({ json: { ...sample, login_id: 'user2' } });
    }
    return route.fulfill({
      json:
        goalMode === 'next'
          ? {
              ...sample,
              toonAmount: 60000,
              dbAmount: 60000,
              totalAmount: 120000,
              goalAmount: 1000000,
              percent: 12,
            }
          : sample,
    });
  });
  await page.route('**/api/u/testuser/graph-settings', (route) => {
    settingsRequests += 1;
    expect(route.request().method()).toBe('GET');
    if (settingsMode === 'error') {
      return route.fulfill({ status: 503, json: { ok: false } });
    }
    if (settingsMode === 'invalid') {
      return route.fulfill({ json: { ok: true, login_id: 'testuser' } });
    }
    return route.fulfill({
      json:
        settingsMode === 'next'
          ? { ...settings, label: '오늘의 목표', color: '#FF5FA2' }
          : settings,
    });
  });

  await page.goto('/widget/graph/testuser');
  await expect(page.locator('.graph-bar-label')).toHaveText('경석이 모금액');
  await expect(page.locator('.graph-bar-amount')).toHaveText('61,900 / 100,000원');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '61.9');
  await expect(page.locator('.graph-bar-label')).toHaveCSS(
    'background-color',
    'rgb(49, 214, 99)',
  );
  for (const selector of ['html', 'body', '#root']) {
    await expect(page.locator(selector)).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect(page.locator(selector)).toHaveCSS('overflow', 'hidden');
  }
  await expect(
    page.locator('.sidebar, .topbar, .ranking-widget, button, input, select'),
  ).toHaveCount(0);

  for (const nextMode of ['error', 'invalid', 'wrong-user']) {
    goalMode = nextMode;
    const before = goalRequests;
    await page.clock.fastForward(10_100);
    await expect.poll(() => goalRequests).toBeGreaterThan(before);
    await expect(page.locator('.graph-bar-amount')).toHaveText('61,900 / 100,000원');
    await expect(page.locator('.graph-bar-label')).toHaveText('경석이 모금액');
  }
  goalMode = 'initial';
  for (const nextMode of ['error', 'invalid']) {
    settingsMode = nextMode;
    const before = settingsRequests;
    await page.clock.fastForward(10_100);
    await expect.poll(() => settingsRequests).toBeGreaterThan(before);
    await expect(page.locator('.graph-bar-label')).toHaveText('경석이 모금액');
    await expect(page.locator('.graph-bar-amount')).toHaveText('61,900 / 100,000원');
  }

  goalMode = 'next';
  settingsMode = 'next';
  await page.clock.fastForward(10_100);
  await expect(page.locator('.graph-bar-label')).toHaveText('오늘의 목표');
  await expect(page.locator('.graph-bar-label')).toHaveCSS(
    'background-color',
    'rgb(255, 95, 162)',
  );
  await expect(page.locator('.graph-bar-amount')).toHaveText('120,000 / 1,000,000원');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
  expect(errors).toEqual([]);
});

test('graph caps progress width and stays compact at OBS/mobile sizes', async ({
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
  await page.route('**/api/u/testuser/graph-settings', (route) =>
    route.fulfill({ json: settings }),
  );
  for (const width of [720, 320, 240]) {
    await page.setViewportSize({ width, height: 100 });
    await page.goto('/widget/graph/testuser');
    await expect(page.locator('.graph-bar-amount')).toHaveText(
      '10,500,000 / 10,000,000원',
    );
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    const panel = await page.locator('.graph-widget').boundingBox();
    const track = await page.locator('.graph-bar-track').boundingBox();
    await expect(page.locator('.graph-bar-fill')).toHaveCSS('width', `${track.width}px`);
    expect(panel.width).toBeLessThanOrEqual(width);
    expect(panel.height).toBeLessThanOrEqual(44);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(page.locator('.graph-bar-amount')).toBeInViewport();
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

test('dashboard keeps encoded widget links and loads its graph settings panel', async ({
  page,
}) => {
  const user = {
    id: 42,
    login_id: 'streamer+42',
    is_active: true,
    payment_date: null,
  };
  await page.addInitScript(
    (value) => localStorage.setItem('hmnat_user', JSON.stringify(value)),
    user,
  );
  await page.route('**/api/donations?*', (route) =>
    route.fulfill({ json: { ok: true, donations: [] } }),
  );
  await page.route('**/api/u/streamer%2B42/graph-settings', (route) =>
    route.fulfill({ json: { ...settings, login_id: user.login_id } }),
  );
  await page.goto('/');
  await expect(page.locator('#ranking-url')).toHaveValue(
    'https://hmnat-livid.vercel.app/widget/ranking/streamer%2B42',
  );
  await expect(page.locator('#graph-url')).toHaveValue(
    'https://hmnat-livid.vercel.app/widget/graph/streamer%2B42',
  );
  await expect(page.getByRole('heading', { name: '그래프바 설정' })).toBeVisible();
  await expect(page.getByLabel('그래프 제목')).toHaveValue('경석이 모금액');
  await expect(page.locator('#goal-url')).toHaveCount(0);
  await expect(page.locator('.url-card')).toHaveCount(2);
});

test('initial failures use graph defaults and recover on the next poll', async ({
  page,
}) => {
  let fail = true;
  await page.clock.install();
  await page.route('**/api/u/testuser/goal-progress', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { ok: false } })
      : route.fulfill({ json: sample }),
  );
  await page.route('**/api/u/testuser/graph-settings', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { ok: false } })
      : route.fulfill({ json: settings }),
  );
  await page.goto('/widget/graph/testuser');
  await expect(page.locator('.graph-bar-label')).toHaveText('후원목표');
  await expect(page.locator('.graph-bar-amount')).toHaveText('—');
  fail = false;
  await page.clock.fastForward(10_100);
  await expect(page.locator('.graph-bar-label')).toHaveText('경석이 모금액');
  await expect(page.locator('.graph-bar-amount')).toHaveText('61,900 / 100,000원');
});

test('encoded URL users receive separate goal and settings requests', async ({
  page,
}) => {
  const requests = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(
      /^\/api\/u\/([^/]+)\/(goal-progress|graph-settings)$/,
    );
    expect(match).not.toBeNull();
    const loginId = decodeURIComponent(match[1]);
    requests.push({ loginId, endpoint: match[2] });
    if (match[2] === 'graph-settings') {
      return route.fulfill({
        json: {
          ...settings,
          login_id: loginId,
          label: loginId === 'testuser' ? '경석이 모금액' : '유나 목표',
        },
      });
    }
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
  await expect(page.locator('.graph-bar-label')).toHaveText('경석이 모금액');
  const otherId = '방송+one/%';
  await page.goto(`/widget/graph/${encodeURIComponent(otherId)}/`);
  await expect(page.locator('.graph-bar-label')).toHaveText('유나 목표');
  await expect(page.locator('.graph-bar-amount')).toHaveText('34,000 / 100,000원');
  for (const loginId of ['testuser', otherId]) {
    expect(requests).toContainEqual({ loginId, endpoint: 'goal-progress' });
    expect(requests).toContainEqual({ loginId, endpoint: 'graph-settings' });
  }
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
  await expect(page.locator('.graph-bar-amount')).toHaveText('—');
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
