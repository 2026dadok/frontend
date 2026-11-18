// 백엔드를 부를 때 공통으로 쓰는 것들.
import { endSession, getToken, isTokenExpired, updateToken } from "./session";
import { PATHS } from "../routes";

// 서버가 이 시간 안에 답하지 않으면 포기한다 (안 그러면 화면이 "불러오는 중"에서 멈춘다)
const TIMEOUT_MS = 10000;

// 로그인이 만료됐을 때: 로그인 정보를 지우고 로그인 화면으로 보낸다. 로그인 화면은 ?expired=1 을 보고 안내를 띄운다.
// 로그아웃 요청의 401 은 어차피 로그아웃하는 중이라 넘긴다.
const expireSession = (url) => {
  if (url.startsWith("/auth/logout")) return;
  endSession();
  window.location.replace(`${PATHS.login}?expired=1`);
};

// access 토큰 재발급. refresh 토큰은 httpOnly 쿠키라서 같이 보내기만 하면 된다.
// 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 한다. 성공하면 true
let refreshing = null;
const refreshToken = () => {
  if (!refreshing) {
    refreshing = fetch("/auth/refresh", { method: "POST", credentials: "include", signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (!data?.accessToken) return false;
        updateToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

// 헤더의 Authorization 을 지금 토큰으로 바꾼다 (재발급 뒤 다시 보낼 때)
const withCurrentToken = (options) => {
  const headers = new Headers(options.headers ?? {});
  if (headers.has("Authorization")) headers.set("Authorization", `Bearer ${getToken()}`);
  return { ...options, headers };
};

// 백엔드에 보내는 모든 요청은 이 함수를 쓴다. fetch 와 같은데 세 가지를 더 한다.
//   1) 시간 제한: timeout(기본 10초) 안에 답이 없으면 실패로 끝낸다.
//   2) 토큰 재발급: 토큰이 만료됐거나 401 이 오면 /auth/refresh 로 한 번 재발급받고 다시 보낸다.
//   3) 로그인 만료: 재발급도 실패하면 로그인 화면으로 보낸다.
export const apiFetch = async (url, { timeout = TIMEOUT_MS, ...options } = {}) => {
  // 이 요청에 로그인 토큰을 실어 보내는지. 토큰을 안 보내는 요청(로그인·회원가입 등)의 401 은 만료가 아니다
  // (예: 로그인 비밀번호가 틀리면 백엔드는 401 을 준다)
  const sentToken = Boolean(getToken()) && new Headers(options.headers).has("authorization");
  const isAuthCall = url.startsWith("/auth/logout") || url.startsWith("/auth/refresh");
  // 이미 만료된 토큰이면 먼저 재발급받고, 재발급도 안 되면 로그인 화면으로 보낸다
  if (sentToken && isTokenExpired() && !isAuthCall) {
    if (!(await refreshToken())) {
      expireSession(url);
      throw new Error("로그인이 만료됐어요.");
    }
    options = withCurrentToken(options);
  }
  let res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
  if (res.status === 401 && sentToken && !isAuthCall) {
    if (await refreshToken()) {
      res = await fetch(url, { ...withCurrentToken(options), signal: AbortSignal.timeout(timeout) });
    }
    if (res.status === 401) expireSession(url);
  }
  return res;
};

// 로그인했는지: 로그인할 때 받은 토큰이 있으면 로그인한 것으로 본다. (토큰은 api/session.js 가 관리)
export const isLoggedIn = () => Boolean(getToken());

// 로그인할 때 받은 토큰을 헤더에 넣는다. 백엔드는 이 값으로 누가 보낸 요청인지 안다.
export const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

// 서버에 요청하고 { ok, data } 를 돌려준다. 서버가 없거나 응답이 JSON 이 아니어도 예외를 던지지 않는다.
// 그래서 부르는 쪽은 try/catch 없이 ok 만 확인하면 된다.
export const requestServer = async (method, url, body) => {
  try {
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

// 응답 필드 이름이 아직 정해지지 않은 곳에서 쓴다. 후보 이름 중 값이 있는 첫 번째를 돌려준다.
// 예: pick(raw, "name", "user_name")
export const pick = (obj, ...names) => names.map((n) => obj?.[n]).find((v) => v != null && v !== "");
