import { requestServer } from "./client";

// 인증 API 호출 모음. 주소와 요청 키 이름은 API 명세서(ver02)를 그대로 따른다.
// 모두 { ok, status, data } 를 돌려주고, 서버가 없거나 응답이 JSON 이 아니어도 예외를 던지지 않는다.

// 인증번호를 보내는 목적 값. TODO: 명세서에 값 목록이 없어서 백엔드와 확인 (지금은 추측한 값)
export const EMAIL_PURPOSE = { signup: "signup", findId: "find_id", findPw: "find_pw" };

const post = async (url, body) => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

// 로그인: 요청 ID, password → 응답 accessToken, refreshToken, ID
export const login = (ID, password) => post("/auth/login", { ID, password });

// 이 브라우저에 남은 로그인 정보(토큰·내 정보)를 지운다
const clearSession = () => {
  ["token", "refreshToken", "user"].forEach((key) => localStorage.removeItem(key));
};

// 로그아웃: POST /auth/logout (로그인 필요). 서버가 실패해도 이 브라우저에서는 로그아웃한다.
export const logout = async () => {
  await requestServer("POST", "/auth/logout");
  clearSession();
};

// 회원탈퇴: DELETE /users/me (로그인 필요). 명세서 비고: 이메일·비밀번호만 삭제, 나머지 기록은 유지.
// 서버가 성공했을 때만 로그인 정보를 지운다. 성공하면 true
export const withdraw = async () => {
  const { ok } = await requestServer("DELETE", "/users/me");
  if (ok) clearSession();
  return ok;
};

// 이메일 인증번호 보내기: 요청 email, purpose → 응답 message, expiresIn
export const sendEmailCode = (email, purpose) => post("/auth/email_send", { email, purpose });

// 이메일 인증번호 확인: 요청 email, code → 응답 verified
export const verifyEmailCode = (email, code, purpose) => post("/auth/email_verify", { email, code, purpose });

// 아이디 찾기: 요청 email → 응답 ID
export const findId = (email) => post("/auth/find_id", { email });

// 회원가입: 요청 name, ID, passward (+ 이메일·생일·목표 시간) → 201 message
// TODO: 이메일·생일·목표 시간을 보내는 키 이름과 목표 시간의 단위는 백엔드와 확인
export const signup = (payload) => post("/auth/signup", payload);

// 아이디 중복 확인: GET /auth/check_id?ID=... → available. 서버가 없으면 data 가 null 이다.
export const checkId = async (ID) => {
  try {
    const res = await fetch(`/auth/check_id?ID=${encodeURIComponent(ID)}`);
    return { ok: res.ok, data: await res.json().catch(() => null) };
  } catch {
    return { ok: false, data: null };
  }
};

// 비밀번호 변경 메일 보내기: 요청 email → 응답 message
// TODO: 명세서 주소 철자(rest-passwrod)가 오타 같다. 백엔드가 만든 실제 주소로 맞춘다.
export const requestPasswordReset = (email) => post("/auth/rest-passwrod", { email });

// 비밀번호 재설정: 요청 token, newpassward → 응답 message
export const resetPassword = (token, newpassword) => post("/auth/pw_reset", { token, newpassword });

// 인증번호 만료 시간(초). 서버가 expiresIn 을 주면 그 값을, 아니면 기본값을 쓴다.
export const toExpireSeconds = (expiresIn, fallback) =>
  Number.isFinite(Number(expiresIn)) && Number(expiresIn) > 0 && Number(expiresIn) <= 3600 ? Number(expiresIn) : fallback;
