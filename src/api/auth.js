import { apiFetch, requestServer } from "./client";
import { endSession } from "./session";

// 인증 API 호출 모음. 주소와 요청 키 이름은 백엔드(test 브랜치)를 그대로 따른다.
// 모두 { ok, status, data } 를 돌려주고, 서버가 없거나 응답이 JSON 이 아니어도 예외를 던지지 않는다.

// 인증번호를 보내는 목적 값. 백엔드(Verification)가 이 세 값만 받고, email_send·email_verify 둘 다 필수다.
export const EMAIL_PURPOSE = { signup: "signup", findId: "find_id", findPw: "find_pw" };

// 응답이 JSON 이면 JSON 으로, 아니면 글자 그대로 읽는다.
// (백엔드의 인증 API 몇 개는 JSON 이 아니라 문장("찾으신 아이디는: ... 입니다.")이나 true/false 를 그대로 준다)
const readBody = async (res) => {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return text || null;
  }
};

const post = async (url, body, { timeout } = {}) => {
  try {
    const res = await apiFetch(url, {
      timeout,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readBody(res);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

// 로그인: 요청 ID, password → 응답 accessToken, refreshToken (백엔드 응답에 ID 는 없다)
export const login = (ID, password) => post("/auth/login", { ID, password });

// 로그인 정보(토큰·내 정보)와 메모리의 화면 데이터를 지운다
const clearSession = () => endSession();

// 로그아웃: POST /auth/logout (로그인 필요). 서버가 실패해도 이 브라우저에서는 로그아웃한다.
export const logout = async () => {
  await requestServer("POST", "/auth/logout");
  clearSession();
};

// 회원탈퇴: DELETE /users/me (로그인 필요). 백엔드: 이메일·비밀번호만 삭제, 나머지 기록은 유지.
// 서버가 성공했을 때만 로그인 정보를 지운다. 성공하면 true
export const withdraw = async () => {
  const { ok } = await requestServer("DELETE", "/users/me");
  if (ok) clearSession();
  return ok;
};

// 이메일 인증번호 보내기: 요청 email, purpose → 응답 문장 ("인증 코드가 이메일로 발송되었습니다."). 유효 시간은 5분
// 백엔드는 Gmail 이 메일을 받아 줄 때까지 기다렸다가 답한다. Gmail 이 느리면 10초를 넘겨서, 넉넉히 30초 기다린다.
const EMAIL_SEND_TIMEOUT_MS = 30000;
export const sendEmailCode = (email, purpose) => post("/auth/email_send", { email, purpose }, { timeout: EMAIL_SEND_TIMEOUT_MS });

// 이메일 인증번호 확인: 요청 email, code, purpose (purpose 필수)
export const verifyEmailCode = (email, code, purpose) => post("/auth/email_verify", { email, code, purpose });

// 아이디 찾기에 이메일 말고 더 받는 입력칸. 화면(FindId.jsx)은 이 목록대로 입력칸을 그린다.
// 백엔드가 지금은 name, birthDate(yyyy-MM-dd), email 을 모두 요구한다. 나중에 email 만 받게 바뀌면 이 배열을 비우면 된다.
export const FIND_ID_FIELDS = [
  { key: "name", placeholder: "이름", type: "text" },
  { key: "birthDate", placeholder: "생년월일", type: "date" }, // date 입력칸 값이 yyyy-MM-dd 라 그대로 보낸다
];

// 아이디 찾기: POST /auth/find_id { email, ...FIND_ID_FIELDS } → 문장 "찾으신 아이디는: xxx 입니다."
// 찾은 아이디를 { ok, id } 로 돌려준다.
export const findId = async (info) => {
  const { ok, status, data } = await post("/auth/find_id", info);
  const id = typeof data === "string" ? data.match(/아이디는\s*:?\s*(\S+)\s*입니다/)?.[1] : null;
  return { ok: ok && Boolean(id), status, id: id ?? null };
};

// 회원가입: POST /auth/signup { ID, password, name, email, birthdate("yyyy-MM-dd"), goal_time("HH:mm") } → 201 message
export const signup = (payload) =>
  passwordRuleError(payload.password ?? "") ? Promise.resolve(BLOCKED) : post("/auth/signup", payload);

// 아이디 중복 확인: GET /auth/check-id?userId=... → 맨 true/false ("이미 있으면 true").
// 화면은 { available } 을 쓰므로 뒤집어서 돌려준다. 서버가 없거나 답이 이상하면 data 가 null 이다.
// 가입 버튼을 누른 사람이 오래 기다리지 않게 5초만 기다린다 (못 받으면 가입할 때 서버가 다시 확인한다)
const CHECK_ID_TIMEOUT_MS = 5000;
export const checkId = async (userId) => {
  try {
    const res = await apiFetch(`/auth/check-id?userId=${encodeURIComponent(userId)}`, { timeout: CHECK_ID_TIMEOUT_MS });
    const taken = await readBody(res);
    if (!res.ok || typeof taken !== "boolean") return { ok: false, data: null };
    return { ok: true, data: { available: !taken } };
  } catch {
    return { ok: false, data: null };
  }
};

// 비밀번호 규칙 (회원가입·비밀번호 재설정·정보 수정 공통). 백엔드는 길이를 검사하지 않아서 프론트에서 막는다.
const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 50;
// 규칙에 어긋나면 안내 문구, 맞으면 "" 를 돌려준다
export const passwordRuleError = (pw) => {
  if (/\s/.test(pw)) return "비밀번호에는 공백을 쓸 수 없어요.";
  if (pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력해주세요.`;
  return "";
};

// 규칙에 어긋난 비밀번호는 백엔드로 보내지 않고 여기서 실패로 돌려준다 (화면에서 먼저 막지만, 혹시 빠져도 서버에 안 가게)
const BLOCKED = { ok: false, status: 400, data: null };

// 비밀번호 재설정: email_send(find_pw) → email_verify(find_pw) → POST /auth/pw_reset { email, code, newPassword }
// 백엔드에는 rest-passwrod 주소도, 따로 받는 token 도 없다. 인증에 쓴 이메일과 인증번호를 그대로 보낸다.
export const resetPassword = (email, code, newPassword) =>
  passwordRuleError(newPassword ?? "") ? Promise.resolve(BLOCKED) : post("/auth/pw_reset", { email, code, newPassword });

