// AI 감상문 ("독다지와 함께" 쓰기). 백엔드 기준 브랜치 ai-review-integration 의 API 를 쓴다.
// (서버가 이 API 가 없는 버전이면 404 가 와서 "아직 준비 중" 안내를 보여준다)
//
//   POST /api/v1/reviews/interview
//     보냄: { book_title, author, messages: [{ role: "user" | "assistant", content }] }   (messages 최대 20개, 내용 2000자 이하)
//     받음: { next_question, is_ready_to_review }
//   POST /api/v1/reviews/generate   (헤더 Idempotency-Key: 같은 요청을 두 번 보내도 한 번만 만든다)
//     보냄: { lib_book_id(내 서재 칸 번호 libraryBookId), book_title, author, messages }
//     받음: { review_id, review_content }  ← 만든 감상문은 백엔드가 바로 감상문으로 저장한다
//   DELETE /api/v1/reviews/{reviewId}   (다시 만들기: 새 감상문을 만든 뒤 이전 것을 지운다)
//
// 제한 (AI 서버 명세 + Spring): book_title 1~200자, author 100자 이하, messages 20개 이하, 메시지 내용 2000자 이하, role 은 user/assistant
//   감상문은 정확히 3문단(문단 사이 빈 줄 "\n\n"), 최대 1000자로 온다
//   1분에 interview 10번, generate 2번까지 (넘으면 429)
// 오류: 프런트는 Spring 을 거쳐서 부른다. AI 서버의 422(요청 형식)는 Spring 에서 400 으로,
//       AI 서버의 503(일시 장애)·502(응답 실패)는 502 로, AI 서버가 늦으면 504 로 온다
import { apiFetch, authHeaders } from "../../api/client";

export const MAX_MESSAGES = 20;
const MAX_TITLE = 200;
const MAX_AUTHOR = 100;
const MAX_CONTENT = 2000;
const AI_TIMEOUT_MS = 60000; // AI 가 글을 만드는 데 시간이 걸린다

const post = async (url, body, headers = {}) => {
  try {
    const res = await apiFetch(url, {
      method: "POST",
      timeout: AI_TIMEOUT_MS,
      headers: { "Content-Type": "application/json", ...authHeaders(), ...headers },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

// 실패했을 때 보여줄 문장
export const aiErrorMessage = (status) => {
  if (status === 404) return "AI 감상문은 아직 서버에 준비되지 않았어요.";
  if (status === 429) return "요청이 너무 많아요. 1분 뒤에 다시 시도해주세요.";
  if (status === 401 || status === 403) return "로그인이 필요해요.";
  if (status === 400 || status === 422) return "보낸 내용이 너무 길거나 올바르지 않아요.";
  if (status === 504 || status === 0) return "독다지의 대답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.";
  return "독다지가 지금은 대답할 수 없어요. 잠시 후 다시 시도해주세요."; // 502·503: AI 서버 장애
};

// 서버 제한에 맞춘다: 최근 20개, 빈 메시지는 빼고, 내용은 2000자까지
const toMessages = (messages) =>
  messages
    .filter(({ content }) => content?.trim())
    .slice(-MAX_MESSAGES)
    .map(({ role, content }) => ({ role, content: content.slice(0, MAX_CONTENT) }));
const bookFields = (book) => ({
  book_title: (book.title || "제목 없음").slice(0, MAX_TITLE),
  author: book.author ? book.author.slice(0, MAX_AUTHOR) : undefined,
});

// 다음 질문 받기 → { ok, status, question, ready }
export const askNextQuestion = async (book, messages) => {
  const { ok, status, data } = await post("/api/v1/reviews/interview", { ...bookFields(book), messages: toMessages(messages) });
  return { ok: ok && Boolean(data?.next_question), status, question: data?.next_question ?? "", ready: Boolean(data?.is_ready_to_review) };
};

// 감상문 만들기(서버가 바로 저장) → { ok, status, reviewId, content }
export const generateReview = async (book, messages) => {
  const { ok, status, data } = await post(
    "/api/v1/reviews/generate",
    { lib_book_id: book.libBookId, ...bookFields(book), messages: toMessages(messages) },
    { "Idempotency-Key": crypto.randomUUID() }
  );
  return { ok: ok && Boolean(data?.review_content), status, reviewId: data?.review_id ?? null, content: data?.review_content ?? "" };
};

// 만든 감상문 지우기 (다시 만들기에서 이전 것을 지울 때)
export const deleteReview = async (reviewId) => {
  try {
    const res = await apiFetch(`/api/v1/reviews/${reviewId}`, { method: "DELETE", headers: authHeaders() });
    return res.ok;
  } catch {
    return false;
  }
};
