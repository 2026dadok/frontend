// AI 감상문 ("독다지와 함께" 쓰기). 백엔드 ai-review-integration 브랜치의 API 를 쓴다.
// (main 브랜치에는 아직 없다 → 서버가 main 이면 404 가 와서 "아직 준비 중" 안내를 보여준다)
//
//   POST /api/v1/reviews/interview
//     보냄: { book_title, author, messages: [{ role: "user" | "assistant", content }] }   (messages 최대 20개, 내용 2000자 이하)
//     받음: { next_question, is_ready_to_review }
//   POST /api/v1/reviews/generate   (헤더 Idempotency-Key: 같은 요청을 두 번 보내도 한 번만 만든다)
//     보냄: { lib_book_id(내 서재 칸 번호 libraryBookId), book_title, author, messages }
//     받음: { review_id, review_content }  ← 만든 감상문은 백엔드가 바로 감상문으로 저장한다
//   DELETE /api/v1/reviews/{reviewId}   (다시 만들기: 새 감상문을 만든 뒤 이전 것을 지운다)
import { apiFetch, authHeaders } from "../../api/client";

export const MAX_MESSAGES = 20;
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
  if (status === 429) return "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
  if (status === 401 || status === 403) return "로그인이 필요해요.";
  return "독다지가 지금은 대답할 수 없어요. 잠시 후 다시 시도해주세요.";
};

const toMessages = (messages) => messages.slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content }));

// 다음 질문 받기 → { ok, status, question, ready }
export const askNextQuestion = async (book, messages) => {
  const { ok, status, data } = await post("/api/v1/reviews/interview", {
    book_title: book.title,
    author: book.author || undefined,
    messages: toMessages(messages),
  });
  return { ok: ok && Boolean(data?.next_question), status, question: data?.next_question ?? "", ready: Boolean(data?.is_ready_to_review) };
};

// 감상문 만들기(서버가 바로 저장) → { ok, status, reviewId, content }
export const generateReview = async (book, messages) => {
  const { ok, status, data } = await post(
    "/api/v1/reviews/generate",
    { lib_book_id: book.libBookId, book_title: book.title, author: book.author || undefined, messages: toMessages(messages) },
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
