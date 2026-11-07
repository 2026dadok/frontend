// 백엔드를 부를 때 공통으로 쓰는 것들.

// 로그인할 때 저장한 토큰을 헤더에 넣는다. 백엔드는 이 값으로 누가 보낸 요청인지 안다.
export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

// 서버에 요청하고 { ok, data } 를 돌려준다. 서버가 없거나 응답이 JSON 이 아니어도 예외를 던지지 않는다.
// 그래서 부르는 쪽은 try/catch 없이 ok 만 확인하면 된다.
export const requestServer = async (method, url, body) => {
  try {
    const res = await fetch(url, {
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
