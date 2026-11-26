// 로그인 정보(토큰·내 정보)와 화면용 임시 데이터를 두는 곳. localStorage 는 쓰지 않는다.
//
// 로그인 정보: sessionStorage
//   - 브라우저 탭을 닫으면 지워진다 (localStorage 처럼 컴퓨터에 계속 남지 않는다).
//   - 새로고침해도 로그인이 유지된다.
//   - TODO: 가장 안전한 방법은 백엔드가 토큰을 httpOnly 쿠키로 주는 것이다 (자바스크립트로 읽을 수 없어서 XSS 에도 안전).
//           백엔드가 쿠키로 바꾸면 여기서 토큰을 저장하지 않고, 요청에 credentials: "include" 만 붙이면 된다.
//
// 화면용 데이터(서재·인용구 등): 메모리
//   - 기준은 백엔드다. 페이지를 새로 열면 서버에서 다시 받는다. 브라우저에는 아무것도 남기지 않는다.

const SESSION_KEY = "dadok.session";

const readSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? {};
  } catch {
    return {};
  }
};

let session = readSession(); // { token, user }

const saveSession = () => {
  try {
    if (session.token) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // 저장이 막힌 브라우저에서는 이 탭이 열려 있는 동안만 로그인이 유지된다
  }
};

export const getToken = () => session.token ?? "";

// 토큰(JWT) 가운데 부분(payload)을 읽는다. 읽을 수 없으면 null
const readPayload = (token) => {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};

// 토큰의 주인(로그인 아이디, JWT sub). 읽을 수 없으면 ""
export const tokenUserId = (token = session.token) => String(readPayload(token)?.sub ?? "");

// 토큰(JWT) 안의 만료 시각(exp)이 지났는지. 읽을 수 없는 토큰이면 만료로 보지 않는다 (서버가 판단).
// 만료되면 api/client.js 가 /auth/refresh 로 먼저 재발급을 시도한다.
export const isTokenExpired = () => {
  const exp = readPayload(session.token)?.exp;
  return typeof exp === "number" && exp * 1000 <= Date.now();
};
export const getSessionUser = () => session.user ?? {};

// 로그인 성공 시
// refresh 토큰은 백엔드가 httpOnly 쿠키로 관리하므로 브라우저 저장소에 두지 않는다.
// 다른 계정의 화면 데이터가 남지 않게 메모리 사본도 비운다.
export const startSession = ({ token, user }) => {
  memory.clear();
  session = { token, user: user ?? {} };
  saveSession();
};

// 토큰 재발급(POST /auth/refresh) 후 새 access 토큰으로 바꾼다
export const updateToken = (token) => {
  session = { ...session, token };
  saveSession();
};

// 로그아웃·탈퇴 시: 로그인 정보와 메모리의 화면 데이터를 모두 지운다
export const endSession = () => {
  session = {};
  saveSession();
  memory.clear();
};

// ───────── 화면용 데이터 (메모리) ─────────
const memory = new Map();
export const memRead = (key, fallback) => (memory.has(key) ? memory.get(key) : fallback);
export const memWrite = (key, value) => {
  memory.set(key, value);
  return true;
};
