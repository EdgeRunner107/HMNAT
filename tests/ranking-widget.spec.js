import { test, expect } from '@playwright/test';

test('widget isolates users, polls, preserves failures and reflects resets', async ({
  page,
}) => {
  let mode = 'initial';
  const requests = [];
  await page.clock.install();
  await page.route('**/api/u/*/ranking?limit=6', async (route) => {
    const loginId = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/')[3],
    );
    requests.push(loginId);
    if (mode === 'error') {
      return route.fulfill({ status: 500, json: { ok: false } });
    }
    const ranking =
      mode === 'reset'
        ? []
        : [
            {
              rank: 1,
              donor_name: `${loginId}-${mode}`,
              total_amount: 50000,
              donation_count: 4,
            },
          ];
    await route.fulfill({ json: { ok: true, login_id: loginId, ranking } });
  });
  await page.goto('/widget/ranking/testuser');
  await expect(page.getByText('testuser-initial')).toBeVisible();
  await expect(page.getByText('50,000개')).toBeVisible();
  for (const selector of ['html', 'body', '#root']) {
    await expect(page.locator(selector)).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect(page.locator(selector)).toHaveCSS('overflow', 'hidden');
  }
  mode = 'error';
  await page.clock.fastForward(3100);
  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('testuser-initial')).toBeVisible();
  mode = 'reset';
  await page.clock.fastForward(3100);
  await expect(page.getByText('후원 내역 없음')).toBeVisible();
  mode = 'new';
  await page.clock.fastForward(3100);
  await expect(page.getByText('testuser-new')).toBeVisible();
  await page.goto('/widget/ranking/SA58PARA');
  await expect(page.getByText('SA58PARA-new')).toBeVisible();
  await expect(page.getByText('testuser-new')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('SA58PARA-new')).toBeVisible();
});

test('widget limits rows and does not change administrator background', async ({
  page,
}) => {
  await page.route('**/api/u/*/ranking?limit=6', (route) =>
    route.fulfill({
      json: {
        ok: true,
        ranking: Array.from({ length: 8 }, (_, i) => ({
          rank: i + 1,
          donor_name: `Donor ${i + 1}`,
          total_amount: 50000 - i * 1000,
        })),
      },
    }),
  );
  await page.goto('/widget/ranking/testuser');
  await expect(page.locator('.ranking-widget-row')).toHaveCount(6);
  await expect(page.getByText('4등', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/ranking-widget.png',
    omitBackground: true,
  });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/ranking-widget-page/);
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(244, 247, 252)');
});
