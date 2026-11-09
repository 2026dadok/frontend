// 인용구 노트 저장소 (localStorage "quotes"). 홈의 "오늘의 문장"(fetchRandomQuote)도 같은 곳을 읽는다.
//   항목: { id, text, bookId, book(책 제목), author, page, date(ISO), createdAt, favorite, serverNoteId }
// 백엔드(명세서 ver02, 모두 /bookstore/notes):
//   작성 POST   (bookID, book_page, date, note_content) → note_id, new_achievements
//   수정 PUT    (note_ID, book_page, date, note_content) → message
//   삭제 DELETE (note_ID)                               → message
// bookID 는 데이터베이스에 저장된 책의 고유 번호(서재에 담을 때 서버가 준 book_id). 인용구는 200자 이하(DB varchar 200).
// 즐겨찾기는 명세서·DB 어디에도 없어서 브라우저에서만 처리한다. TODO: 백엔드와 확인

import { isLoggedIn, requestServer } from "../../api/client";

const KEY = "quotes";
export const MAX_QUOTE_LENGTH = 200;

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
};

// 인용구는 로그인한 사용자 것이다. 로그인하지 않았으면 브라우저에 남은 인용구는 보여주지 않는다.
export const getQuotes = () => (isLoggedIn() ? read() : []);

const toDateOnly = (iso) => new Date(iso).toLocaleDateString("sv-SE"); // yyyy-MM-dd (사용자 기기 날짜)

// 인용구를 쓴다. 서버(POST /bookstore/notes)에 먼저 보내고, 서버가 없거나 실패해도 화면에 보이도록 브라우저에도 저장한다.
// 서버의 책 번호(serverBookId)를 모르는 책은 서버에 보내지 않는다. "saved" | "login" | "error"
export const addQuote = async ({ book, page, text }) => {
  if (!isLoggedIn()) return "login";
  const now = new Date().toISOString();
  let serverNoteId = null;
  if (Number.isInteger(book.serverBookId)) {
    const { data } = await requestServer("POST", "/bookstore/notes", {
      bookID: book.serverBookId,
      book_page: page ?? 0,
      date: toDateOnly(now),
      note_content: text,
    });
    // 응답에서 인용구 번호(note_id)를 찾는다. TODO: 응답 안에서의 위치(최상위 / data 안)는 백엔드와 확인
    const raw = data?.note_id ?? data?.data?.note_id ?? null;
    serverNoteId = raw !== null && Number.isInteger(Number(raw)) ? Number(raw) : null;
  }
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
  const { ok } = await requestServer("DELETE", "/bookstore/notes", { note_ID: target.serverNoteId });
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
