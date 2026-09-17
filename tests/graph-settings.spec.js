import { test, expect } from '@playwright/test';

const user = {
  id: 42,
  login_id: 'streamer+42',
  payment_date: null,
  is_active: true,
};

async function openDashboard(page) {
  const state = {
    saved: {
      label: '경석이 모금액',
      color: '#31D663',
    },
    gets: 0,
    puts: [],
    failSave: false,
  };
  await page.addInitScript((savedUser) => {
    localStorage.setItem('hmnat_user', JSON.stringify(savedUser));
  }, user);
  await page.route('**/api/donations?*', (route) =>
    route.fulfill({ json: { ok: true, donations: [] } }),
  );
  await page.route('**/api/u/*/graph-settings', async (route) => {
    const request = route.request();
    const encodedLoginId = new URL(request.url()).pathname.split('/')[3];
    expect(decodeURIComponent(encodedLoginId)).toBe(user.login_id);
    if (request.method() === 'GET') {
      state.gets += 1;
      return route.fulfill({
        json: {
          ok: true,
          login_id: user.login_id,
          ...state.saved,
          isDefault: false,
        },
      });
    }
    expect(request.method()).toBe('PUT');
    const body = request.postDataJSON();
    state.puts.push(body);
    await state.beforeSave?.();
    if (state.failSave) {
      return route.fulfill({
        status: 500,
        json: { ok: false, error: 'Test save failure' },
      });
    }
    state.saved = structuredClone(body);
    return route.fulfill({
      json: {
        ok: true,
        login_id: user.login_id,
        ...state.saved,
        isDefault: false,
      },
    });
  });
  await page.goto('/');
  await expect(page.getByLabel('그래프 제목')).toHaveValue(state.saved.label);
  return state;
}

test('saved settings load, draft changes preview only, save persists and reload restores', async ({
  page,
}) => {
  const state = await openDashboard(page);
  const label = page.getByLabel('그래프 제목');
  const hex = page.getByLabel('그래프 HEX 색상');
  const picker = page.getByLabel('그래프 색상 선택');
  const preview = page.locator('.graph-settings-preview');
  const feedback = page.locator('.graph-settings-feedback');

  await expect(hex).toHaveValue('#31D663');
  await expect(picker).toHaveValue('#31d663');
  await expect(preview.locator('.graph-bar-label')).toHaveText('경석이 모금액');
  await expect(preview.locator('.graph-bar-label')).toHaveCSS(
    'background-color',
    'rgb(49, 214, 99)',
  );

  await label.fill('오늘의 목표');
  await hex.fill('#FF5FA2');
  await expect(preview.locator('.graph-bar-label')).toHaveText('오늘의 목표');
  await expect(preview.locator('.graph-bar-label')).toHaveCSS(
    'background-color',
    'rgb(255, 95, 162)',
  );
  await expect(picker).toHaveValue('#ff5fa2');
  expect(state.puts).toEqual([]);
  expect(state.saved).toEqual({ label: '경석이 모금액', color: '#31D663' });

  await page.getByRole('button', { name: '설정 저장' }).click();
  await expect(feedback).toContainText('그래프 설정이 저장되었습니다.');
  expect(state.puts).toEqual([{ label: '오늘의 목표', color: '#FF5FA2' }]);

  await page.reload();
  await expect(page.getByLabel('그래프 제목')).toHaveValue('오늘의 목표');
  await expect(page.getByLabel('그래프 HEX 색상')).toHaveValue('#FF5FA2');
  expect(state.gets).toBeGreaterThanOrEqual(2);
});

test('invalid drafts are not saved and API failures preserve input for retry', async ({
  page,
}) => {
  const state = await openDashboard(page);
  const label = page.getByLabel('그래프 제목');
  const hex = page.getByLabel('그래프 HEX 색상');
  const save = page.getByRole('button', { name: '설정 저장' });
  const feedback = page.locator('.graph-settings-feedback');

  await label.fill('   ');
  await save.click();
  await expect(feedback).toContainText('#RRGGBB');
  await label.fill('저장 실패 보존');
  await hex.fill('blue');
  await save.click();
  await expect(feedback).toContainText('#RRGGBB');
  expect(state.puts).toEqual([]);

  await hex.fill('#AABBCC');
  state.failSave = true;
  await save.click();
  await expect(feedback).toContainText('저장에 실패했습니다.');
  await expect(label).toHaveValue('저장 실패 보존');
  await expect(hex).toHaveValue('#AABBCC');

  state.failSave = false;
  await save.click();
  await expect(feedback).toContainText('저장되었습니다.');
  expect(state.puts).toHaveLength(2);
});

test('save button prevents rapid duplicate requests while a write is pending', async ({
  page,
}) => {
  const state = await openDashboard(page);
  let releaseSave;
  state.beforeSave = () =>
    new Promise((resolve) => {
      releaseSave = resolve;
    });
  await page.getByLabel('그래프 제목').fill('중복 방지');
  const save = page.getByRole('button', { name: '설정 저장' });
  const feedback = page.locator('.graph-settings-feedback');
  await save.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect.poll(() => state.puts.length).toBe(1);
  await expect(page.getByRole('button', { name: '저장 중...' })).toBeDisabled();
  releaseSave();
  await expect(feedback).toContainText('저장되었습니다.');
  expect(state.puts).toHaveLength(1);
});
