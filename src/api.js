import { sanitizeUser } from './auth';

export const API_BASE = (
  import.meta.env.VITE_API_BASE || 'http://localhost:3000'
).replace(/\/$/, '');

async function requestJson(path, { signal, ...options } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);

  try {
    const response = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (!response.ok || data?.ok !== true) {
      throw new Error(
        typeof data?.error === 'string'
          ? data.error
          : '요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
    return data;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new Error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    }
    if (error instanceof TypeError) {
      throw new Error('서버에 연결하지 못했습니다. 네트워크 연결을 확인해주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function loginUser(loginId, password) {
  const data = await requestJson('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId.trim(), password }),
  });
  return sanitizeUser(data.user);
}

// 전체 내역만 조회하며 후원 실행용 next/complete 엔드포인트는 호출하지 않습니다.
export async function fetchDonations(loginId, { signal } = {}) {
  const data = await requestJson(
    '/api/donations?login_id=' + encodeURIComponent(loginId),
    { signal },
  );
  const donations = data.donations ?? [];
  if (
    !Array.isArray(donations) ||
    !donations.every((row) => row && row.id != null && typeof row.executed === 'boolean')
  ) {
    throw new Error('후원 내역 응답 형식이 올바르지 않습니다.');
  }
  return donations;
}

async function updateDonation(loginId, donationId, action) {
  const data = await requestJson(
    `/api/u/${encodeURIComponent(loginId)}/donations/${encodeURIComponent(donationId)}/${action}`,
    { method: 'POST' },
  );
  const donation = data.donation;
  if (
    !donation ||
    String(donation.id) !== String(donationId) ||
    typeof donation.executed !== 'boolean' ||
    typeof donation.canceled !== 'boolean'
  ) {
    throw new Error('후원 처리 응답 형식이 올바르지 않습니다.');
  }
  return donation;
}

export function retryDonation(loginId, donationId) {
  return updateDonation(loginId, donationId, 'retry');
}

export function cancelDonation(loginId, donationId) {
  return updateDonation(loginId, donationId, 'cancel');
}

export async function fetchUserGoalProgress(loginId, { signal } = {}) {
  const data = await requestJson(`/api/u/${encodeURIComponent(loginId)}/goal-progress`, {
    signal,
    cache: 'no-store',
  });
  if (
    data.login_id !== loginId ||
    !['toonAmount', 'dbAmount', 'totalAmount', 'goalAmount'].every(
      (key) => Number.isSafeInteger(data[key]) && data[key] >= 0,
    ) ||
    data.goalAmount === 0 ||
    !Number.isFinite(data.percent) ||
    data.percent < 0
  ) {
    throw new Error('후원 목표 응답 형식이 올바르지 않습니다.');
  }
  return data;
}
