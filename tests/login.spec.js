import { test, expect } from '@playwright/test';

// 브라우저 테스트에서만 API 응답을 대체합니다. 앱에는 테스트 계정이 없습니다.
const user = { id: 42, login_id: 'streamer+42', payment_date: null, is_active: true };
const donation = {
  id: 1,
  user_id: 42,
  donor_name: '경석',
  amount: 1000,
  text: '응원합니다',
  executed: false,
  created_at: '2026-09-15T05:31:22Z',
  executed_at: null,
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/u/*/graph-settings', (route) => {
    const loginId = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/')[3],
    );
    return route.fulfill({
      json: {
        ok: true,
        login_id: loginId,
        label: '후원목표',
        color: '#3B82F6',
        isDefault: true,
      },
    });
  });
});

async function submitLogin(page) {
  await page.getByLabel('ID', { exact: true }).fill(` ${user.login_id} `);
  await page.getByLabel('Password', { exact: true }).fill('browser-test-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
}

test('실제 API 요청 형식, 로그인 상태 유지, 상태 갱신과 오류 복구, 로그아웃', async ({
  page,
}) => {
  const errors = [];
  let requests = 0;
  let mode = 'waiting';
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/login', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      login_id: user.login_id,
      password: 'browser-test-password',
    });
    await route.fulfill({
      json: { ok: true, user: { ...user, password: 'must-not-be-saved' } },
    });
  });
  await page.route('**/api/donations?*', async (route) => {
    requests += 1;
    expect(new URL(route.request().url()).searchParams.get('login_id')).toBe(
      user.login_id,
    );
    if (mode === 'error') {
      return route.fulfill({
        status: 503,
        json: { ok: false, error: '잠시 후 다시 시도해주세요.' },
      });
    }
    await route.fulfill({
      json: {
        ok: true,
        donations: [
          {
            ...donation,
            executed: mode === 'complete',
            executed_at: mode === 'complete' ? '2026-09-15T05:32:00Z' : null,
          },
        ],
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await submitLogin(page);
  await expect(page.locator('.account-button')).toContainText(user.login_id);
  await expect(page.locator('.status-waiting')).toHaveText('대기');
  await expect(page.locator('.date-cell')).toHaveText('2026. 09. 15. 14:31:22');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('hmnat_user'))),
  ).toEqual(user);
  await expect(page.locator('.url-card')).toHaveCount(2);
  await expect(page.locator('.stat-card')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('.status-waiting')).toBeVisible();
  mode = 'error';
  await expect(page.getByRole('alert')).toContainText(
    '후원 내역을 새로 불러오지 못했습니다.',
    { timeout: 7000 },
  );
  await expect(page.locator('.status-waiting')).toBeVisible();
  mode = 'complete';
  await expect(page.locator('.status-complete')).toHaveText('svg완료', {
    timeout: 7000,
  });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.stat-card.yellow .stat-value')).toHaveText('0건');
  await expect(page.locator('.stat-card.green .stat-value')).toHaveText('1건');
  await page.locator('.account-button').click();
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  const afterLogout = requests;
  await page.waitForTimeout(3300);
  expect(requests).toBe(afterLogout);
  expect(await page.evaluate(() => localStorage.getItem('hmnat_user'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('로그인 중 표시, 서버 오류와 비JSON 응답, 최초 로딩과 빈 목록', async ({ page }) => {
  let releaseLogin;
  let releaseDonations;
  let mode = 'failure';
  await page.route('**/api/login', async (route) => {
    if (mode === 'failure') {
      await new Promise((resolve) => {
        releaseLogin = resolve;
      });
      return route.fulfill({
        status: 401,
        json: { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      });
    }
    if (mode === 'invalid') {
      return route.fulfill({
        status: 502,
        contentType: 'text/html',
        body: '<h1>Bad gateway</h1>',
      });
    }
    return route.fulfill({ json: { ok: true, user } });
  });
  await page.route('**/api/donations?*', async (route) => {
    await new Promise((resolve) => {
      releaseDonations = resolve;
    });
    await route.fulfill({ json: { ok: true, donations: [] } });
  });
  await page.goto('/');
  await submitLogin(page);
  await expect(page.getByRole('button', { name: '로그인 중...' })).toBeDisabled();
  await expect.poll(() => Boolean(releaseLogin)).toBe(true);
  releaseLogin();
  await expect(page.getByRole('alert')).toContainText(
    '아이디 또는 비밀번호가 올바르지 않습니다.',
  );
  mode = 'invalid';
  await submitLogin(page);
  await expect(page.getByRole('alert')).toContainText('서버 응답을 읽지 못했습니다.');
  mode = 'success';
  await submitLogin(page);
  await expect(page.locator('tbody')).toContainText('후원 내역을 불러오는 중...');
  await expect.poll(() => Boolean(releaseDonations)).toBe(true);
  releaseDonations();
  await expect(page.locator('tbody')).toContainText('계좌후원 내역이 없습니다.');
});

test('손상된 저장 정보는 로그인으로 복귀하고 모바일 정렬 유지', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hmnat_user', '{invalid'));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  const card = await page.locator('.login-card').boundingBox();
  expect(Math.abs(card.x + card.width / 2 - 187.5)).toBeLessThan(2);
  expect(Math.abs(card.y + card.height / 2 - 406)).toBeLessThan(2);
});
