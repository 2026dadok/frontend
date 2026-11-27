// 감상문 화면들(감상문, AI 감상문, 홈, 타이머)이 같이 쓰는 것들.
import { memRead, memWrite, tokenUserId } from "../../api/session";
import { daysSince } from "../bookSearch/bookStore";

// ───────── 일차 계산 ─────────
// 일차는 백엔드가 정한다.
//   공동서재 책: 함께 읽기 시작한 날부터 센 날짜 (서버가 시작일 started_at 을 준다)
//   나의 서재 책: 감상문을 쓴 순서 (1번째, 2번째 …). 서재 응답에 담은 날짜가 없어서 날짜로는 셀 수 없다.
//     그래서 오늘 이미 썼으면 마지막 일차가, 아니면 그다음 일차가 오늘이다.
const isToday = (iso) => Boolean(iso) && new Date(iso).toDateString() === new Date().toDateString();
export const countDays = (book, entries) => {
  const lastWritten = Math.max(0, ...entries.map((e) => e.day));
  if (!Number.isInteger(book?.jointId)) {
    const today = entries.some((e) => isToday(e.date)) ? lastWritten : lastWritten + 1;
    return Math.max(1, today);
  }
  return Math.max(1, lastWritten, book.startedAt ? daysSince(book.startedAt) + 1 : 1);
};

// 책을 구분하는 값 (공동서재는 같은 책이라도 친구마다 다르다)
const bookKey = (book) => (Number.isInteger(book?.jointId) ? `joint-${book.jointId}` : String(book?.id ?? ""));
const dateKey = (date = new Date()) => new Date(date).toLocaleDateString("sv-SE"); // yyyy-MM-dd (기기 날짜)

// ───────── 일차별 읽은 쪽수 ─────────
// 백엔드는 날짜별 쪽수를 저장하지 않는다 (읽은 시간만 날짜별로 남긴다).
// 그래서 타이머로 쪽수를 저장할 때 "어디부터 어디까지" 읽었는지 이 탭의 메모리에 남겨 둔다 (새로 열면 사라진다).
// TODO: 백엔드가 감상문(또는 날짜별 기록)에 시작·끝 쪽수를 주면 그 값을 쓴다 → pageRangeOf 의 entry.pages
const RANGE_KEY = "pageRanges";

export const recordReadPages = (book, fromPage, toPage) => {
  const to = Number(toPage);
  if (!Number.isInteger(to) || to < 1) return;
  const from = Math.min(to, Math.max(1, (Number(fromPage) || 0) + 1)); // 지난번 쪽수 다음부터
  const all = memRead(RANGE_KEY, {});
  const mine = all[bookKey(book)] ?? {};
  const today = mine[dateKey()];
  // 하루에 여러 번 읽으면 처음 시작한 쪽 ~ 마지막 쪽
  mine[dateKey()] = { from: today ? Math.min(today.from, from) : from, to: Math.max(today?.to ?? 0, to) };
  memWrite(RANGE_KEY, { ...all, [bookKey(book)]: mine });
};

// "150-182쪽" (모르면 "")
export const pageRangeOf = (book, entryOrDate) => {
  const fromServer = entryOrDate?.pages; // TODO: 백엔드 필드 이름이 정해지면 bookStore 에서 { from, to } 로 넣는다
  const range = fromServer ?? memRead(RANGE_KEY, {})[bookKey(book)]?.[dateKey(entryOrDate?.date ?? entryOrDate ?? new Date())];
  if (!range?.to) return "";
  return range.from && range.from !== range.to ? `${range.from}-${range.to}쪽` : `${range.to}쪽`;
};

// ───────── 하다 만 AI 감상문 (이어 하기) ─────────
// AI 감상문 채팅을 하다가 나가면 나눈 말을 남겨 두었다가, 홈 말풍선의 [AI감상문 바로 가기] 로 이어서 하게 한다.
// 일반 감상문(스스로 쓰기)은 이어 쓰기가 없다: 쓰기 창은 [나가기] 로만 닫히고, 닫으면 쓰던 글은 버린다 (디자이너).
// localStorage 는 쓰지 않는다 → sessionStorage (새로고침해도 남고, 탭을 닫으면 사라진다)
const DRAFT_KEY = "dadok.reviewDraft";

const readDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
};
const writeDraft = (draft) => {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ owner: tokenUserId(), ...draft }));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // 저장이 막힌 브라우저에서는 이어 하기를 하지 않는다
  }
};

// 같은 탭에서 다른 계정으로 로그인하면 이전 계정의 것은 보여주지 않는다 (owner = 로그인 아이디)
export const getDraft = () => {
  const draft = readDraft();
  if (!draft?.book || draft.owner !== tokenUserId() || draft.kind !== "ai") return null;
  return Array.isArray(draft.messages) && draft.messages.length ? draft : null;
};

// 화면에 필요한 책 정보만 남긴다
const slimBook = (b) => ({
  id: b.id, title: b.title, author: b.author, cover: b.cover, intro: b.intro,
  serverBookId: b.serverBookId, libBookId: b.libBookId, jointId: b.jointId, startedAt: b.startedAt, friendName: b.friendName, completed: b.completed,
});

// AI 감상문 채팅 (내가 한 번이라도 답했을 때만 남긴다)
export const saveAiDraft = (book, day, messages, ready) => {
  if (!messages.some((m) => m.role === "user")) return;
  writeDraft({ kind: "ai", book: slimBook(book), day, messages, ready });
};

// 이 책의 AI 채팅 기록 (없으면 null)
export const aiDraftFor = (book) => {
  const draft = getDraft();
  return draft && bookKey(draft.book) === bookKey(book) ? draft : null;
};

// 감상문을 저장했으면 지운다. book 을 주면 그 책의 것일 때만 지운다
export const clearDraft = (book) => {
  if (!book || aiDraftFor(book)) writeDraft(null);
};
