const SESSION_KEY = 'hmnat_user';

// 허용한 사용자 필드만 보관하며 비밀번호 등 추가 필드는 저장하지 않습니다.
export function sanitizeUser(user) {
  if (
    !user ||
    typeof user.login_id !== 'string' ||
    !user.login_id.trim() ||
    user.id == null
  ) {
    throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
  }

  return {
    id: user.id,
    login_id: user.login_id,
    payment_date: user.payment_date ?? null,
    is_active: user.is_active ?? null,
  };
}

export function getLoginSession() {
  try {
    const savedUser = localStorage.getItem(SESSION_KEY);
    return savedUser ? sanitizeUser(JSON.parse(savedUser)) : null;
  } catch {
    return null;
  }
}

export function setLoginSession(user) {
  const safeUser = sanitizeUser(user);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    localStorage.removeItem('hmnat_logged_in');
  } catch {
    // 저장소 접근 제한 시 현재 탭의 React state로만 유지합니다.
  }
  return safeUser;
}

export function clearLoginSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('hmnat_logged_in');
  } catch {
    // 저장소 접근이 제한되어도 현재 화면에서 로그아웃합니다.
  }
}
