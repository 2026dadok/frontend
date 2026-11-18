// 인용구 노트. 기준은 백엔드이고 메모리에 화면용 사본을 둔다 (브라우저 저장소에는 남기지 않는다). 홈의 "오늘의 문장"도 같은 사본을 읽는다.
//   항목: { id, text, bookId, book(책 제목), author, page, date(ISO), createdAt, favorite, serverNoteId }
// 백엔드(모두 /bookstore/notes, 목록은 GET /bookstore/note_page → { notes: [...] }):
//   작성 POST   (bookID, book_page, date, note_content) → note_id, new_achievements
//   수정 PUT    (note_ID, book_page, date, note_content) → message
//   삭제 DELETE (note_ID)                               → message
// bookID 는 데이터베이스에 저장된 책의 고유 번호(서재에 담을 때 서버가 준 book_id). 인용구는 200자 이하(DB varchar 200).
// 즐겨찾기는 백엔드에 없어서 메모리에서만 처리한다 (새로 열면 사라진다). TODO: 백엔드에 즐겨찾기 저장 API 요청

import { isLoggedIn, pick, requestServer } from "../../api/client";
import { memRead, memWrite } from "../../api/session";

const KEY = "quotes";
export const MAX_QUOTE_LENGTH = 200;

const read = () => {
  const list = memRead(KEY, []);
  return Array.isArray(list) ? list : [];
};

const write = (list) => memWrite(KEY, list);

// 인용구는 로그인한 사용자 것이다. 로그인하지 않았으면 브라우저에 남은 인용구는 보여주지 않는다.
// 바로 그릴 때 쓰는 사본. 서버 값으로 맞추려면 syncQuotes() 를 부른다.
export const getQuotes = () => (isLoggedIn() ? read() : []);

// GET /bookstore/note_page 로 인용구 목록을 받아 사본을 서버 값으로 바꾼다. 실패하면 사본 그대로.
// 즐겨찾기는 서버에 없어서 사본에 있던 값을 이어 붙인다.
// TODO: 응답 필드 이름이 명세서에 없다. 백엔드가 정하면 후보 이름을 하나로 줄인다.
export const syncQuotes = async () => {
  if (!isLoggedIn()) return [];
  const { ok, data } = await requestServer("GET", "/bookstore/note_page");
  if (!ok) return read();
  const raw = [data, data?.data, data?.notes, data?.data?.notes].find(Array.isArray) ?? [];
  const cached = read();
  const list = raw.map((n) => {
    const serverNoteId = Number(pick(n, "note_id", "note_ID", "noteID", "id"));
    const old = cached.find((q) => q.serverNoteId === serverNoteId);
    const date = pick(n, "date", "created_at") ?? old?.date ?? new Date().toISOString();
    return {
      id: old?.id ?? `server-${serverNoteId}`,
      text: pick(n, "note_content", "content", "text") ?? "",
      bookId: old?.bookId ?? String(pick(n, "book_id", "bookID") ?? ""),
      serverBookId: Number(pick(n, "book_id", "bookID")) || null,
      book: pick(n, "title", "book_title") ?? old?.book ?? "",
      author: pick(n, "author") ?? old?.author ?? "",
      page: Number(pick(n, "book_page", "page")) || null,
      date,
      createdAt: pick(n, "created_at") ?? date,
      favorite: old?.favorite ?? false,
      serverNoteId: Number.isInteger(serverNoteId) ? serverNoteId : null,
    };
  });
  write(list);
  return list;
};

const toDateOnly = (iso) => new Date(iso).toLocaleDateString("sv-SE"); // yyyy-MM-dd (사용자 기기 날짜)

// 인용구를 쓴다. 서버(POST /bookstore/notes)가 받아줬을 때만 저장한다. "saved" | "login" | "error"
// 서버의 책 번호(serverBookId)를 모르는 책(서재에 없는 책)은 서버에 보낼 수 없어서 "error".
export const addQuote = async ({ book, page, text }) => {
  if (!isLoggedIn()) return "login";
  if (!Number.isInteger(book.serverBookId)) return "error";
  const now = new Date().toISOString();
  const { ok, data } = await requestServer("POST", "/bookstore/notes", {
    bookID: book.serverBookId,
    book_page: page ?? 0,
    date: toDateOnly(now),
    note_content: text,
  });
  if (!ok) return "error";
  // 응답에서 인용구 번호(note_id)를 찾는다. TODO: 응답 안에서의 위치(최상위 / data 안)는 백엔드와 확인
  const raw = data?.note_id ?? data?.data?.note_id ?? null;
  const serverNoteId = raw !== null && Number.isInteger(Number(raw)) ? Number(raw) : null;
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    bookId: book.id,
    book: book.title,
    author: book.author ?? "",
    page: page || null,
    date: now,
    createdAt: now,
    favorite: false,
    serverNoteId,
  };
  return write([item, ...read()]) ? "saved" : "error";
};

// 인용구 수정은 DB에 반영되어야 하므로 서버(PUT /bookstore/notes)가 성공했을 때만 바꾼다. "saved" | "error"
// 서버가 없거나 인용구 번호(serverNoteId)를 모르면 바꾸지 않는다. 쪽수·날짜는 원래 값을 그대로 보낸다.
export const updateQuote = async (id, text) => {
  const list = read();
  const target = list.find((q) => q.id === id);
  if (!target || !Number.isInteger(target.serverNoteId)) return "error";
  const { ok } = await requestServer("PUT", "/bookstore/notes", {
    note_ID: target.serverNoteId,
    book_page: target.page ?? 0,
    date: toDateOnly(target.date),
    note_content: text,
  });
  if (!ok) return "error";
  return write(list.map((q) => (q.id === id ? { ...q, text } : q))) ? "saved" : "error";
};

// 인용구 삭제도 서버(DELETE /bookstore/notes)가 성공했을 때만 지운다. "removed" | "error"
// 서버가 없거나 인용구 번호를 모르면 지우지 않는다. (서재 책 삭제와 같은 원칙)
export const removeQuote = async (id) => {
  const list = read();
  const target = list.find((q) => q.id === id);
  if (!target) return "removed";
  if (!Number.isInteger(target.serverNoteId)) return "error";
  // 백엔드 코드가 아직 안 올라와서 번호를 어디서 읽는지 모른다. 다른 DELETE(리뷰 등)처럼 주소 뒤에도, 본문에도 같이 보낸다
  const { ok } = await requestServer("DELETE", `/bookstore/notes?note_ID=${target.serverNoteId}`, { note_ID: target.serverNoteId });
  if (!ok) return "error";
  return write(list.filter((q) => q.id !== id)) ? "removed" : "error";
};

export const toggleFavorite = (id) => {
  const list = read();
  const target = list.find((q) => q.id === id);
  if (!target) return null;
  const next = !target.favorite;
  write(list.map((q) => (q.id === id ? { ...q, favorite: next } : q)));
  return next;
};

// "2026-09-20T..." → "260920" / "20260920"
const pad = (n) => String(n).padStart(2, "0");
export const formatShort = (iso) => {
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};
export const formatFull = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};
