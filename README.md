# HMNAT 계좌후원 대시보드

기존 React + Vite 대시보드 디자인을 유지하고 운영 백엔드 API를 연결한 프론트엔드입니다.

## 실행

```bash
npm install
npm run dev
```

## API 연결

- `src/api.js`의 `API_BASE` 기본값은 `https://hmnation.onrender.com`입니다. 변경 시 `.env.example`을 `.env.local`로 복사하고 개발 서버를 재시작하세요.
- `loginUser(loginId, password)`: `POST /api/login`, JSON body는 `{ login_id, password }`이며 성공 응답의 `user`를 반환합니다.
- `fetchDonations(loginId, { signal })`: `GET /api/donations?login_id=...`, 로그인한 사용자 ID를 URL 인코딩하여 조회합니다.
- HTTP 오류, 서버의 `ok: false`, 비JSON 응답, 연결 오류, 15초 응답 제한 시간을 처리합니다.
- 브라우저에서 백엔드 API만 호출하며 서버 코드나 비밀 키는 포함하지 않습니다. 서버가 프론트 출처의 CORS 요청을 허용해야 합니다.

## 로그인 상태

- `src/auth.js`에서 `hmnat_user` 저장·복원·삭제를 관리합니다.
- `id`, `login_id`, `payment_date`, `is_active`만 저장합니다. 비밀번호와 추가 응답 필드는 저장하지 않습니다.
- 기존 테스트 계정 비교와 `hmnat_logged_in` 기반 로그인 복원은 제거했습니다.
- 저장 데이터가 손상되면 로그인 화면으로 돌아갑니다. 저장소 접근이 제한되면 React state로 현재 탭에서만 로그인합니다.
- 오른쪽 사용자 메뉴에서 로그인 ID 확인 및 로그아웃이 가능합니다.

## 후원 내역

- 로그인 직후 조회하고 요청 완료 3초 후 재귀 `setTimeout`으로 다시 조회합니다.
- 로그아웃·컴포넌트 해제 시 타이머와 진행 중인 요청을 취소합니다.
- 조회 실패 시 기존 목록을 유지하며 오류를 표시합니다. 성공하면 오류가 해제됩니다.
- 최초 로딩과 빈 목록은 기존 테이블 안에 표시합니다. 실행여부는 boolean 기준 대기·완료 두 상태만 사용합니다.
- 금액을 포함한 응답 객체는 유지하며 시간은 한국 시간으로 표시합니다. 실패 통계는 0입니다.
- 앱의 mock 데이터와 fallback은 제거했습니다. 테스트 코드의 응답 대체는 브라우저 검증에만 사용됩니다.
- URL 카드 주소는 임시 주소이며 `App.jsx`의 `rankingUrl`, `graphUrl`에서 관리합니다. 기존 복사·열기 동작은 유지합니다.

## 검증

```bash
npm run build
npm run format:check
npm test
```

Playwright는 설치된 Microsoft Edge와 로컬 Vite 서버를 사용합니다. 로그인 요청 형식, 사용자별 조회, 비밀번호 저장 방지, 새로고침 유지, 오류 복구, 대기→완료 갱신, 로그아웃 시 갱신 중단, 로딩·빈 목록·모바일 배치를 검증합니다.

운영 확인: 실제 계정으로 로그인 → 사용자 ID와 내역 확인 → 외부에서 후원 완료 처리 → 다음 갱신에서 완료 배지 확인 → 로그아웃. 자동 테스트는 API 응답을 대체하므로 실제 계정의 운영 서버 인증 성공 여부는 별도 확인이 필요합니다.
