// 백엔드를 부를 때 공통으로 쓰는 것들.
import { endSession, getToken, isTokenExpired } from "./session";
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

// 백엔드에 보내는 모든 요청은 이 함수를 쓴다. fetch 와 같은데 두 가지를 더 한다.
//   1) 시간 제한: timeout(기본 10초) 안에 답이 없으면 실패로 끝낸다.
//   2) 로그인 만료: 토큰의 만료 시각이 지났거나, 토큰을 보냈는데 401 이 오면 로그인 화면으로 보낸다.
export const apiFetch = async (url, { timeout = TIMEOUT_MS, ...options } = {}) => {
  const sentToken = Boolean(getToken());
  // 이미 만료된 토큰이면 보내지 않고 바로 로그인 화면으로 보낸다
  if (sentToken && isTokenExpired() && !url.startsWith("/auth/logout")) {
    expireSession(url);
    throw new Error("로그인이 만료됐어요.");
  }
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
  if (res.status === 401 && sentToken) expireSession(url);
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
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
};

// 응답 필드 이름이 아직 정해지지 않은 곳에서 쓴다. 후보 이름 중 값이 있는 첫 번째를 돌려준다.
// 예: pick(raw, "name", "user_name")
export const pick = (obj, ...names) => names.map((n) => obj?.[n]).find((v) => v != null && v !== "");
