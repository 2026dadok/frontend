// Vercel 서버 함수: 개발 때 vite.config.js 프록시가 하던 일을 배포 환경에서 대신한다.
//   브라우저 → (같은 사이트 주소) /auth/login 등 → 이 함수 → 백엔드 서버(BACKEND_URL)
//   브라우저 → /yes24/v1/...                 → 이 함수 → https://apis.yes24.com (X-Api-Key 를 여기서 붙인다)
// 값은 Vercel 프로젝트 설정 → Environment Variables 에 넣는다 (코드·브라우저에는 노출되지 않는다).
//   BACKEND_URL   예: https://api.example.com  (끝에 / 없이)
//   YES24_API_KEY YES24 키
// 어떤 주소를 이 함수로 보내는지는 vercel.json 의 rewrites 에 있다. (__to: 보낼 곳, __p: 원래 경로)

// 다른 서버로 그대로 넘기면 안 되는 헤더 (연결·압축·Vercel 내부용)
const DROP_REQUEST = ["host", "connection", "content-length", "accept-encoding"];
const DROP_RESPONSE = ["content-encoding", "content-length", "transfer-encoding", "connection"];

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

async function handle(request) {
  const url = new URL(request.url);
  const to = url.searchParams.get("__to");
  const path = url.searchParams.get("__p") ?? "";
  url.searchParams.delete("__to");
  url.searchParams.delete("__p");
  const query = url.searchParams.toString();

  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (DROP_REQUEST.includes(name) || name.startsWith("x-vercel") || name.startsWith("x-forwarded")) headers.delete(name);
  }

  let target;
  if (to === "yes24") {
    target = `https://apis.yes24.com/${path}`;
    headers.set("X-Api-Key", process.env.YES24_API_KEY ?? "");
  } else if (to === "backend") {
    const base = process.env.BACKEND_URL;
    if (!base) return json(503, { message: "BACKEND_URL 이 설정되지 않았어요." });
    target = `${base.replace(/\/+$/, "")}/${path}`;
  } else {
    return json(404, { message: "알 수 없는 경로예요." });
  }
  if (query) target += `?${query}`;

  try {
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined, // JSON·사진(multipart) 모두 그대로 넘긴다
      redirect: "manual",
    });
    const out = new Headers(res.headers);
    DROP_RESPONSE.forEach((name) => out.delete(name));
    return new Response(res.body, { status: res.status, headers: out });
  } catch {
    return json(502, { message: "서버에 연결하지 못했어요." });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
