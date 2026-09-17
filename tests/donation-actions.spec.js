import { test, expect } from '@playwright/test';

const user = { id: 42, login_id: 'streamer+42', payment_date: null, is_active: true };
const seed = [
  { id: 1, donor_name: '완료후원', executed: true, canceled: false },
  { id: 2, donor_name: '대기후원', executed: false, canceled: false },
  { id: 3, donor_name: '완료후취소', executed: true, canceled: true },
  { id: 4, donor_name: '대기중취소', executed: false, canceled: true },
].map((row) => ({
  ...row,
  user_id: user.id,
  amount: 10000,
  text: '응원합니다',
  created_at: '2026-09-15T05:31:22Z',
  executed_at: row.executed ? '2026-09-15T05:32:00Z' : null,
}));

const rowFor = (page, name) => page.getByRole('row').filter({ hasText: name });

async function openDashboard(page) {
  const state = {
    rows: structuredClone(seed),
    actions: [],
    listRequests: 0,
    errors: [],
    unexpected: [],
  };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.clock.install();
  await page.addInitScript((savedUser) => {
    localStorage.setItem('hmnat_user', JSON.stringify(savedUser));
  }, user);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/donations') {
      state.listRequests += 1;
      expect(request.method()).toBe('GET');
      expect(url.searchParams.get('login_id')).toBe(user.login_id);
      const rows = structuredClone(state.rows);
      await state.beforeList?.(state.listRequests);
      if (state.failList) {
        return route.fulfill({ status: 503, json: { ok: false } });
      }
      return route.fulfill({ json: { ok: true, donations: rows } });
    }
    if (url.pathname.endsWith('/graph-settings') && request.method() === 'GET') {
      return route.fulfill({
        json: {
          ok: true,
          login_id: user.login_id,
          label: '후원목표',
          color: '#3B82F6',
          isDefault: true,
        },
      });
    }
    const match = url.pathname.match(
      /^\/api\/u\/([^/]+)\/donations\/(\d+)\/(retry|cancel)$/,
    );
    if (!match) {
      state.unexpected.push(url.pathname);
      return route.fulfill({ status: 404, json: { ok: false } });
    }
    expect(request.method()).toBe('POST');
    expect(decodeURIComponent(match[1])).toBe(user.login_id);
    const id = Number(match[2]);
    const action = match[3];
    state.actions.push({ id, action });
    await state.beforeAction?.(id, action);
    if (state.failure === 'json') {
      return route.fulfill({ status: 500, json: { ok: false, error: 'Test failure' } });
    }
    if (state.failure === 'html') {
      return route.fulfill({
        status: 502,
        contentType: 'text/html',
        body: 'Bad gateway',
      });
    }
    if (state.failure === 'network') return route.abort('failed');
    if (state.failure === 'malformed') {
      return route.fulfill({ json: { ok: true, donation: { id: 999 } } });
    }
    const donation = state.rows.find((row) => row.id === id);
    Object.assign(
      donation,
      action === 'retry'
        ? { executed: false, canceled: false, executed_at: null }
        : { canceled: true },
    );
    return route.fulfill({ json: { ok: true, donation } });
  });
  await page.goto('/');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  return state;
}

test('상태 우선순위, 관리 버튼, 취소 제외 통계와 모바일 테이블', async ({ page }) => {
  const state = await openDashboard(page);
  const completed = rowFor(page, '완료후원');
  const waiting = rowFor(page, '대기후원');
  await expect(page.getByRole('columnheader', { name: '관리' })).toBeVisible();
  await expect(completed.locator('.status')).toHaveText('svg완료');
  await expect(completed.getByRole('button')).toHaveText(['재실행', '취소']);
  await expect(waiting.locator('.status')).toHaveText('대기');
  await expect(waiting.getByRole('button')).toHaveText(['취소']);
  for (const name of ['완료후취소', '대기중취소']) {
    await expect(rowFor(page, name).locator('.status')).toHaveText('취소');
    await expect(rowFor(page, name).getByRole('button')).toHaveText(['재실행']);
  }
  await expect(page.locator('.stat-card.blue .stat-value')).toHaveText('4건');
  await expect(page.locator('.stat-card.yellow .stat-value')).toHaveText('1건');
  await expect(page.locator('.stat-card.green .stat-value')).toHaveText('1건');
  await expect(page.locator('.stat-card.red .stat-value')).toHaveText('0건');
  await page.screenshot({
    path: 'test-results/donation-actions-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await completed.getByRole('button', { name: '재실행' }).scrollIntoViewIfNeeded();
  await expect(completed.getByRole('button', { name: '재실행' })).toBeInViewport();
  await page.screenshot({
    path: 'test-results/donation-actions-mobile.png',
    fullPage: true,
  });
  expect(state.errors).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test('완료 → 재실행 → 자동 완료 갱신 → 취소 → 복원과 즉시 재조회', async ({ page }) => {
  const state = await openDashboard(page);
  const row = rowFor(page, '완료후원');
  const beforeRetry = state.listRequests;
  await row.getByRole('button', { name: '재실행' }).click();
  await expect(row.locator('.status')).toHaveText('대기');
  await expect.poll(() => state.listRequests).toBeGreaterThan(beforeRetry);
  expect(state.rows[0].executed_at).toBeNull();
  state.rows[0].executed = true;
  state.rows[0].executed_at = '2026-09-15T05:33:00Z';
  await page.clock.fastForward(3100);
  await expect(row.locator('.status')).toHaveText('svg완료');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('이 입금을 방송 후원에서 제외하시겠습니까?');
    await dialog.dismiss();
  });
  await row.getByRole('button', { name: '취소', exact: true }).click();
  expect(state.actions).toHaveLength(1);
  page.once('dialog', (dialog) => dialog.accept());
  const beforeCancel = state.listRequests;
  await row.getByRole('button', { name: '취소', exact: true }).click();
  await expect(row.locator('.status')).toHaveText('취소');
  await expect.poll(() => state.listRequests).toBeGreaterThan(beforeCancel);
  expect(state.rows[0].executed).toBe(true);
  await row.getByRole('button', { name: '재실행' }).click();
  await expect(row.locator('.status')).toHaveText('대기');
  expect(state.rows[0].canceled).toBe(false);
  expect(state.actions).toEqual([
    { id: 1, action: 'retry' },
    { id: 1, action: 'cancel' },
    { id: 1, action: 'retry' },
  ]);
  expect(state.errors).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test('요청 중에는 해당 행만 비활성화하고 중복 클릭과 동시 행 처리를 보호', async ({
  page,
}) => {
  const state = await openDashboard(page);
  const releases = new Map();
  state.beforeAction = (id) => new Promise((resolve) => releases.set(id, resolve));
  page.on('dialog', (dialog) => dialog.accept());
  const completed = rowFor(page, '완료후원');
  const waiting = rowFor(page, '대기후원');
  await completed.getByRole('button', { name: '재실행' }).click();
  await expect(completed.getByRole('button', { name: '재실행' })).toBeDisabled();
  await expect(
    completed.getByRole('button', { name: '취소', exact: true }),
  ).toBeDisabled();
  await completed.getByRole('button', { name: '재실행' }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(waiting.getByRole('button')).toBeEnabled();
  await waiting.getByRole('button').click();
  await expect(waiting.getByRole('button')).toBeDisabled();
  await expect(rowFor(page, '완료후취소').getByRole('button')).toBeEnabled();
  await expect.poll(() => releases.size).toBe(2);
  expect(state.actions).toHaveLength(2);
  releases.get(1)();
  await expect(completed.locator('.status')).toHaveText('대기');
  await expect(waiting.getByRole('button')).toBeDisabled();
  releases.get(2)();
  await expect(waiting.locator('.status')).toHaveText('취소');
  await expect(waiting.getByRole('button')).toBeEnabled();
  expect(state.errors).toEqual([]);
});

for (const action of ['retry', 'cancel']) {
  test(`${action} 오류 시 기존 내역 유지, 오류 안내와 재시도 가능`, async ({ page }) => {
    const state = await openDashboard(page);
    const row = rowFor(page, '완료후원');
    const label = action === 'retry' ? '재실행' : '취소';
    page.on('dialog', (dialog) => dialog.accept());
    for (const failure of ['json', 'html', 'network', 'malformed']) {
      state.failure = failure;
      await row.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText(`${label} 처리에 실패했습니다.`);
      await expect(row.locator('.status')).toHaveText('svg완료');
      await expect(page.locator('tbody tr')).toHaveCount(4);
      await expect(row.getByRole('button', { name: label, exact: true })).toBeEnabled();
    }
    state.failure = null;
    await row.getByRole('button', { name: label, exact: true }).click();
    await expect(row.locator('.status')).toHaveText(action === 'retry' ? '대기' : '취소');
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(state.errors).toEqual([]);
  });
}

test('취소 직전 시작한 목록 요청이나 재조회 실패가 성공한 상태를 덮어쓰지 않음', async ({
  page,
}) => {
  const state = await openDashboard(page);
  let releaseOldList;
  const initialRequests = state.listRequests;
  state.beforeList = (count) =>
    count === initialRequests + 1
      ? new Promise((resolve) => {
          releaseOldList = resolve;
        })
      : undefined;
  await page.clock.fastForward(3100);
  await expect.poll(() => Boolean(releaseOldList)).toBe(true);
  state.failList = true;
  page.once('dialog', (dialog) => dialog.accept());
  const row = rowFor(page, '완료후원');
  await row.getByRole('button', { name: '취소', exact: true }).click();
  await expect(row.locator('.status')).toHaveText('취소');
  await expect(page.getByRole('alert')).toContainText(
    '후원 내역을 새로 불러오지 못했습니다.',
  );
  state.failList = false;
  releaseOldList();
  await page.clock.fastForward(3100);
  await expect.poll(() => state.listRequests).toBeGreaterThanOrEqual(initialRequests + 3);
  await expect(row.locator('.status')).toHaveText('취소');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
