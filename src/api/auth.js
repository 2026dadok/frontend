// 인증 API 호출 모음. 주소와 요청 키 이름은 API 명세서(ver02)를 그대로 따른다.
// 모두 { ok, status, data } 를 돌려주고, 서버가 없거나 응답이 JSON 이 아니어도 예외를 던지지 않는다.

// 이메일 인증 목적 값
export const EMAIL_PURPOSE = { signup: "SIGNUP", findId: "FIND_ID", findPw: "FIND_PASSWORD" };

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

// 로그인: 요청 email, password → 응답 accessToken, refreshToken, ID
export const login = (email, password) => post("/auth/login", { email, password });

// 이메일 인증번호 보내기: 요청 email, type → 응답 message, expiresIn
export const sendEmailCode = (email, type) => post("/auth/email_send", { email, type });

// 이메일 인증번호 확인: 요청 email, code, type → 응답 verified
export const verifyEmailCode = (email, code, type) => post("/auth/email_verify", { email, code, type });

// 아이디 찾기: 요청 name, birthDate, email → 응답 ID
export const findId = (name, birthDate, email) => post("/auth/find_id", { name, birthDate, email });

// 회원가입: 요청 email, password, name, birthDate, defaultTimerTime → 201 message
export const signup = (payload) => post("/auth/signup", payload);
// 아이디(이메일) 중복 확인: 요청 email → 응답 Boolean
export const checkEmailDuplicate = async (email) => {
  try {
    const res = await fetch(`/auth/check_id?email=${encodeURIComponent(email)}`);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};


// 인증번호 만료 시간(초). 서버가 expiresIn 을 주면 그 값을, 아니면 기본값을 쓴다.
export const toExpireSeconds = (expiresIn, fallback) =>
  Number.isFinite(Number(expiresIn)) && Number(expiresIn) > 0 && Number(expiresIn) <= 3600 ? Number(expiresIn) : fallback;
