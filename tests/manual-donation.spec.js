import { test, expect } from '@playwright/test';

const user = {
  id: 42,
  login_id: 'streamer+42',
  payment_date: null,
  is_active: true,
};

async function openDashboard(page) {
  const state = {
    rows: [],
    creates: [],
    actions: [],
    listRequests: 0,
    unexpected: [],
    nextId: 101,
  };

  await page.clock.install();
  await page.addInitScript((savedUser) => {
    localStorage.setItem('hmnat_user', JSON.stringify(savedUser));
  }, user);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/donations') {
      state.listRequests += 1;
      return route.fulfill({
        json: { ok: true, donations: structuredClone(state.rows) },
      });
    }

    if (url.pathname === `/api/u/${encodeURIComponent(user.login_id)}/manual-donations`) {
      const input = request.postDataJSON();
      state.creates.push(input);
      await state.beforeCreate?.();
      if (state.createFailure) {
        return route.fulfill({
          status: 500,
          json: { ok: false, error: 'Test create failure' },
        });
      }
      const completed = input.executionStatus === 'completed';
      const donation = {
        id: state.nextId++,
        user_id: user.id,
        donor_name: input.nickname.trim() || '익명',
        amount: input.amount,
        text: input.message.trim(),
        executed: true,
        canceled: false,
        created_at: input.clickedAt,
        executed_at: completed ? input.clickedAt : null,
      };
      state.rows.unshift(donation);
      return route.fulfill({
        status: 201,
        json: { ok: true, login_id: user.login_id, donation },
      });
    }

    const match = url.pathname.match(
      /^\/api\/u\/([^/]+)\/donations\/(\d+)\/(run|retry|cancel)$/,
    );
    if (match) {
      expect(decodeURIComponent(match[1])).toBe(user.login_id);
      const id = Number(match[2]);
      const action = match[3];
      state.actions.push({ id, action });
      const donation = state.rows.find((row) => row.id === id);
      if (action === 'cancel') {
        donation.canceled = true;
      } else {
        Object.assign(donation, {
          executed: false,
          canceled: false,
          executed_at: null,
        });
      }
      return route.fulfill({ json: { ok: true, donation } });
    }

    state.unexpected.push(url.pathname);
    return route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto('/');
  await expect(page.getByText('수동 후원 추가', { exact: true })).toBeVisible();
  return state;
}

async function fillManualForm(
  page,
  { nickname = '', amount, message = '', status = 'pending' },
) {
  await page.getByLabel('닉네임').fill(nickname);
  await page.getByLabel('금액').fill(String(amount));
  await page.getByLabel('메시지').fill(message);
  await page.getByLabel('실행여부').selectOption(status);
}

const rowFor = (page, name) => page.getByRole('row').filter({ hasText: name });

test('미실행 수동 후원은 저장·새로고침·polling 후 유지되고 명시적 실행만 허용', async ({
  page,
}) => {
  const state = await openDashboard(page);
  await fillManualForm(page, {
    nickname: '홍길동',
    amount: 50000,
    message: '화이팅',
  });
  await expect(page.getByLabel('금액')).toHaveValue('50,000');
  await page.getByRole('button', { name: '내역 추가' }).click();

  expect(state.creates).toHaveLength(1);
  expect(state.creates[0]).toMatchObject({
    nickname: '홍길동',
    amount: 50000,
    message: '화이팅',
    executionStatus: 'pending',
  });
  expect(Number.isFinite(Date.parse(state.creates[0].clickedAt))).toBe(true);

  let row = rowFor(page, '홍길동');
  await expect(row).toContainText('50,000원');
  await expect(row).toContainText('화이팅');
  await expect(row.locator('.status')).toHaveText('미실행');
  await expect(row.getByRole('button')).toHaveText(['실행', '취소']);
  expect(state.actions).toEqual([]);
  expect(state.unexpected).toEqual([]);

  await page.reload();
  row = rowFor(page, '홍길동');
  await expect(row.locator('.status')).toHaveText('미실행');
  await page.clock.fastForward(3100);
  await expect(row.locator('.status')).toHaveText('미실행');

  await row.getByRole('button', { name: '실행', exact: true }).click();
  await expect(row.locator('.status')).toHaveText('대기');
  expect(state.actions).toEqual([{ id: 101, action: 'run' }]);

  state.rows[0].executed = true;
  state.rows[0].executed_at = new Date().toISOString();
  await page.clock.fastForward(3100);
  await expect(row.locator('.status')).toHaveText('svg완료');
  await row.getByRole('button', { name: '재실행' }).click();
  await expect(row.locator('.status')).toHaveText('대기');

  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: '취소', exact: true }).click();
  await expect(row.locator('.status')).toHaveText('취소');
  expect(state.actions).toEqual([
    { id: 101, action: 'run' },
    { id: 101, action: 'retry' },
    { id: 101, action: 'cancel' },
  ]);
  expect(state.unexpected).toEqual([]);
});

test('실행완료와 익명 저장은 자동 실행 없이 기존 완료 행과 동일하게 표시', async ({
  page,
}) => {
  const state = await openDashboard(page);
  await fillManualForm(page, {
    amount: 10000,
    message: '이미 실행함',
    status: 'completed',
  });
  await page.getByRole('button', { name: '내역 추가' }).click();

  expect(state.creates).toHaveLength(1);
  expect(state.creates[0].nickname).toBe('익명');
  const row = rowFor(page, '이미 실행함');
  await expect(row).toContainText('익명');
  await expect(row.locator('.status')).toHaveText('svg완료');
  await expect(row.getByRole('button')).toHaveText(['재실행', '취소']);
  await expect(page.getByLabel('닉네임')).toHaveValue('');
  await expect(page.getByLabel('금액')).toHaveValue('');
  await expect(page.getByLabel('메시지')).toHaveValue('');
  await expect(page.getByLabel('실행여부')).toHaveValue('pending');
  expect(state.actions).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test('잘못된 금액을 차단하고 저장 실패 시 입력값을 보존한 뒤 재시도', async ({
  page,
}) => {
  const state = await openDashboard(page);
  for (const amount of ['0', '-1000', 'abc', '']) {
    await page.getByLabel('금액').fill(amount);
    await page.getByRole('button', { name: '내역 추가' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      '금액은 0보다 큰 정수로 입력해주세요.',
    );
  }
  expect(state.creates).toHaveLength(0);

  state.createFailure = true;
  await fillManualForm(page, {
    nickname: '보존 테스트',
    amount: 30000,
    message: '다시 시도',
  });
  await page.getByRole('button', { name: '내역 추가' }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했습니다');
  await expect(page.getByLabel('닉네임')).toHaveValue('보존 테스트');
  await expect(page.getByLabel('금액')).toHaveValue('30,000');
  await expect(page.getByLabel('메시지')).toHaveValue('다시 시도');

  state.createFailure = false;
  await page.getByRole('button', { name: '내역 추가' }).click();
  await expect(rowFor(page, '보존 테스트')).toBeVisible();
  expect(state.creates).toHaveLength(2);
});

test('저장 중 연속 클릭은 한 건만 생성하고 버튼을 비활성화', async ({ page }) => {
  const state = await openDashboard(page);
  let releaseCreate;
  state.beforeCreate = () =>
    new Promise((resolve) => {
      releaseCreate = resolve;
    });
  await fillManualForm(page, {
    nickname: '중복 방지',
    amount: 20000,
    message: '한 번만',
  });
  const submit = page.getByRole('button', { name: '내역 추가' });
  await submit.evaluate((button) => {
    button.click();
    button.click();
  });

  await expect.poll(() => state.creates.length).toBe(1);
  await expect(page.getByRole('button', { name: '저장 중...' })).toBeDisabled();
  releaseCreate();
  await expect(rowFor(page, '중복 방지')).toBeVisible();
  expect(state.rows).toHaveLength(1);
});
