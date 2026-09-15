import { useRef, useState } from 'react';
import { loginUser } from '../api';

export default function LoginPage({ onLogin }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) {
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError('');

    let user;

    try {
      user = await loginUser(loginId.trim(), password);
    } catch (loginError) {
      setError(loginError.message || '로그인하지 못했습니다. 다시 시도해주세요.');
      return;
    } finally {
      submitting.current = false;
      setLoading(false);
    }

    onLogin(user);
  }

  return (
    <main className="login-page">
      <section
        className="login-card"
        aria-labelledby="login-title"
      >
        <div className="login-logo">
          <h1
            className="login-title"
            id="login-title"
          >
            HMNAT
          </h1>
          <p className="login-subtitle">계정에 로그인하세요</p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <div className="login-field">
            <label htmlFor="login-id">ID</label>
            <input
              className="login-input"
              id="login-id"
              name="username"
              type="text"
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              onBlur={() => setLoginId((value) => value.trim())}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              className="login-input"
              id="login-password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              disabled={loading}
              required
            />
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {error && (
            <p
              className="login-error"
              id="login-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
