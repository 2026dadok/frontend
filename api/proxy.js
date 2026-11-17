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

// YES24 는 키가 서버(이 함수)에만 있어서 브라우저에서는 보이지 않는다.
// 대신 이 주소를 다른 사람이 불러서 우리 키를 쓰지 못하게 막는다:
//   - 우리 앱이 쓰는 두 주소(월별 베스트셀러, 책 검색)만, GET 으로만 허용
//   - 우리 사이트 화면에서 보낸 요청만 허용 (Origin/Referer 의 주소가 이 사이트와 같아야 한다)
//   - 같은 요청은 Vercel 이 10분 동안 저장해 두었다가 돌려줘서 YES24 호출 횟수를 줄인다
const YES24_ALLOWED = ["v1/category/bestsellerMonthly", "v1/goods/itemList"];
const YES24_CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

const fromOurSite = (request) => {
  const host = new URL(request.url).host;
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
};

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
    if (request.method !== "GET" || !YES24_ALLOWED.includes(path)) return json(404, { message: "알 수 없는 경로예요." });
    if (!fromOurSite(request)) return json(403, { message: "허용되지 않은 요청이에요." });
    target = `https://apis.yes24.com/${path}`;
    headers.set("X-Api-Key", process.env.YES24_API_KEY ?? "");
  } else if (to === "backend") {
    const base = process.env.BACKEND_URL;
    if (!base) return json(503, { message: "BACKEND_URL 이 설정되지 않았어요." });
    target = `${base.replace(/\/+$/, "")}/${path}`;
    // 브라우저가 붙인 Origin 을 그대로 넘기면 백엔드 CORS 설정에 이 사이트 주소가 없어서 POST·PUT·DELETE 가 403 이 된다.
    // 여기서 백엔드로 가는 건 서버끼리의 요청이라 CORS 가 필요 없으니 뺀다.
    headers.delete("origin");
    headers.delete("referer");
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
    if (to === "yes24" && res.ok) out.set("cache-control", YES24_CACHE);
    if (to === "yes24") out.delete("set-cookie");
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
