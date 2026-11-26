// 서재·공동서재·감상문·리뷰 데이터. 목록의 기준은 백엔드이고, 메모리에 화면용 사본을 둔다 (브라우저 저장소에는 남기지 않는다).
//   - 나의 서재 목록: GET /library/my_page      → syncMyLibrary() 가 받아서 사본을 바꾼다
//   - 공동서재 목록:  GET /shared-readings      → syncSharedLibrary()
//   - 공동서재 상세:  GET /library/joints/{id}  → fetchJointDetail()
//   - 공동서재 만들기·초대: POST /shared-readings → requestCoReading()
//   - 감상문:        GET /bookstore/feeling_page, POST /bookstore/feelings
//   - 리뷰:          GET /books/{id}/reviews, POST·PUT /books/reviews, DELETE /books/reviews?reviewID=
// 출판사·책 소개는 백엔드 책 데이터에 없어서 사본에 같이 둔다 (표지가 없으면 YES24 에서 찾아 채운다).
// 필드 이름은 백엔드(test 브랜치) 응답 그대로다.

import { isLoggedIn, requestServer } from "../../api/client";
import { getSessionUser, memRead, memWrite } from "../../api/session";
import { searchBooks } from "./bookSearchApi";

const KEYS = {
  myLibrary: "myLibraryBooks",
  sharedLibrary: "sharedLibraryBooks",
  reviews: "bookReviews",
  commentaries: "bookCommentaries", // { [bookId]: [{ day, content, date }, ...] }
};

// 메모리 사본 (api/session.js). 로그아웃하면 지워지고, 새로 열면 서버에서 다시 받는다.
const read = memRead;
const write = memWrite;

// ───────── 내 정보 ─────────
// 로그인할 때 저장한 내 정보 그대로. 로그인하지 않았으면 빈 객체
export const getSavedUser = () => (isLoggedIn() ? getSessionUser() : {});

// 로그인 응답(token 제외)을 App.jsx 가 "user" 에 저장해 둔다. 필드명은 nickname / name 을 기대한다.
export const getMe = () => {
  const user = getSessionUser();
  return {
    key: String(user.ID ?? user.name ?? user.id ?? "me"), // 리뷰 작성자 구분용 (로그인 아이디)
    displayName: user.name || user.ID || "나", // TODO: 표시 이름은 user_name. 로그인 응답에는 없어서 내 정보 API에서 받아와야 한다
  };
};

// ───────── 나의 서재 ─────────
// 홈 화면이 그대로 쓰는 형태: { id, title, cover, completed } (+ 부가 정보)
const toShelfBook = (book) => ({
  id: book.id,
  title: book.title,
  cover: book.cover,
  author: book.author,
  publisher: book.publisher,
  totalPage: book.pages,
  category: book.genre ?? "", // 큰 장르 (서재의 분류 필터)
  intro: book.intro ?? "", // 감상문 화면의 책 소개
  completed: false,
});

// 서재는 로그인한 사용자 것이다. 로그인하지 않았으면 브라우저에 남아 있는 책(예시로 넣어 본 책 등)은 보여주지 않는다.
// 바로 그릴 때 쓰는 사본. 서버 값으로 맞추려면 syncMyLibrary() 를 부른다.
export const getMyLibrary = () => (isLoggedIn() ? read(KEYS.myLibrary, []) : []);

// ───────── 서버 목록 받아서 사본 맞추기 ─────────
const toInt = (v) => (v !== null && v !== "" && Number.isInteger(Number(v)) ? Number(v) : null);
// 응답이 배열이면 그대로, { key: [...] } 이면 그 배열
const listOf = (data, key) => (Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : []);

// 표지가 없는 책은 제목으로 YES24 에서 찾아 표지·출판사·소개를 채운다 (한 번 찾으면 사본에 남는다)
const fillFromYes24 = async (book) => {
  if (book.cover || !book.title) return book;
  try {
    const { books } = await searchBooks(book.title, 1);
    const found = books.find((b) => !book.author || b.author?.includes(book.author)) ?? books[0];
    if (!found) return book;
    return { ...book, id: book.id ?? found.id, cover: found.cover, publisher: found.publisher, category: found.genre ?? "", intro: found.intro ?? "" };
  } catch {
    return book;
  }
};

// 서버의 책 한 권 + 사본에 있던 같은 책(서버 번호로 찾는다) → 화면용 책
// 나의 서재: { libraryBookId, book_id, book_title, author, cover_url, total_page, read_page, finished }
//   book_id = 책 번호(쪽수·읽은 시간·리뷰에 쓴다), libraryBookId = 내 서재에 담긴 칸의 번호(AI 감상문 lib_book_id 에 쓴다)
// 공동서재도 book_id, book_title, cover_url, total_page 를 같은 이름으로 준다 (author·read_page 는 없다)
const mergeServerBook = (raw, cached) => {
  const serverBookId = toInt(raw.book_id);
  const totalPage = toInt(raw.total_page) ?? cached?.totalPage ?? null;
  const readPage = toInt(raw.read_page) ?? cached?.readPage ?? 0;
  return {
    ...cached,
    id: cached?.id ?? `server-${serverBookId}`,
    serverBookId,
    libBookId: toInt(raw.libraryBookId) ?? cached?.libBookId ?? null,
    title: raw.book_title ?? cached?.title ?? "",
    author: raw.author ?? cached?.author ?? "",
    cover: raw.cover_url || cached?.cover || undefined, // 빈 글자 대신 undefined (img src="" 방지)
    totalPage,
    readPage,
    completed: Boolean(raw.finished) || (totalPage ? readPage >= totalPage : false),
  };
};

// GET /library/my_page 로 나의 서재를 받아 사본을 서버 값으로 바꾼다. 서버가 없거나 실패하면 사본 그대로.
export const syncMyLibrary = async () => {
  if (!isLoggedIn()) return [];
  const { ok, data } = await requestServer("GET", "/library/my_page");
  if (!ok) return getMyLibrary();
  const cached = getMyLibrary();
  const merged = await Promise.all(
    listOf(data, "books").map((raw) => {
      const id = toInt(raw.book_id);
      return fillFromYes24(mergeServerBook(raw, cached.find((b) => b.serverBookId === id)));
    })
  );
  write(KEYS.myLibrary, merged);
  return merged;
};

// 나의 서재에서 같은 책을 찾는다.
// 서재에 담은 직후에는 YES24 의 책 id 로 찾을 수 있지만, 새로고침하면 서버에서 다시 받아서 id 가 "server-번호"가 된다.
// 그래서 id → 서버 책 번호 → 제목·저자 순서로 찾는다. (백엔드 서재 응답에는 ISBN 이 없다)
const sameText = (a, b) => String(a ?? "").replace(/\s+/g, "").toLowerCase() === String(b ?? "").replace(/\s+/g, "").toLowerCase();
export const findInMyLibrary = (book) => {
  if (!book) return null;
  const list = getMyLibrary();
  return (
    list.find((b) => b.id === book.id) ??
    (Number.isInteger(book.serverBookId) ? list.find((b) => b.serverBookId === book.serverBookId) : undefined) ??
    (book.title ? list.find((b) => sameText(b.title, book.title) && (!b.author || !book.author || sameText(b.author, book.author))) : undefined) ??
    null
  );
};

// "added" | "exists" | "login" | "error"
// 로그인하지 않았으면 담지 않고 "login" 을 돌려준다.
// 백엔드(POST /library/books)가 받아줬을 때만 담는다. 표지·출판사는 백엔드 명세에 없어서 메모리 사본에 같이 둔다.
// 백엔드는 isbn → 제목·저자 순으로 같은 책을 찾고, 없으면 새로 등록한다. 응답은 서재 책 한 권 (book_id 포함)
export const addToMyLibrary = async (book) => {
  if (!isLoggedIn()) return "login";
  const list = getMyLibrary();
  if (findInMyLibrary(book)) return "exists";
  const { ok, data } = await requestServer("POST", "/library/books", {
    title: book.title,
    author: book.author,
    total_page: book.pages,
    isbn: book.isbn,
    cover_url: book.cover,
  });
  if (!ok) return "error"; // 서재는 서버에 저장되어야 한다 (브라우저에만 담지 않는다)
  const serverBookId = toInt(data?.book_id ?? null);
  const libBookId = toInt(data?.libraryBookId ?? null);
  if (!write(KEYS.myLibrary, [{ ...toShelfBook(book), serverBookId, libBookId }, ...list])) return "error";
  return "added";
};

// 서재(나의 서재·공동 서재)에 담긴 책의 일부 값을 고친다. (예: 뒤늦게 가져온 책 소개)
export const updateShelfBook = (bookId, patch) => {
  [KEYS.myLibrary, KEYS.sharedLibrary].forEach((key) => {
    const list = read(key, []);
    if (list.some((b) => b.id === bookId)) {
      write(key, list.map((b) => (b.id === bookId ? { ...b, ...patch } : b)));
    }
  });
};

// 나의 서재에서 책을 삭제한다. "removed" | "error"
// 삭제는 DB에 반영되어야 하므로 백엔드(DELETE /library/books)가 성공했을 때만 지운다.
// 서버가 실패하거나 아직 없으면 책은 그대로 남는다.
// 주소에 넣는 책 번호는 등록할 때 서버가 돌려준 정수 번호(book_id)다.
// 번호를 모르는 책은 서버에 삭제를 요청할 수 없어서 지우지 않는다.
export const removeFromMyLibrary = async (bookId) => {
  const list = getMyLibrary();
  const book = list.find((b) => b.id === bookId);
  if (!book) return "removed";
  if (!Number.isInteger(book.serverBookId)) return "error";
  const { ok } = await requestServer("DELETE", `/library/books/${book.serverBookId}`);
  if (!ok) return "error";
  return write(KEYS.myLibrary, list.filter((b) => b.id !== bookId)) ? "removed" : "error";
};

// ───────── 공동 서재 ─────────
export const getSharedLibrary = () => (isLoggedIn() ? read(KEYS.sharedLibrary, []) : []); // 나의 서재와 같이 로그인해야 보인다

// 공동서재 한 개: { id(책), jointId, title, cover, friendId, friendName, myPercent, friendPercent, startedAt, ... }
// 서버: { shared_reading_id, book_id, book_title, cover_url, total_page, started_at, my_percent, partner_percent, partner: { ID, name } }
const toPercent = (v) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)));
const mergeServerJoint = (raw, cached) => ({
  ...mergeServerBook(raw, cached),
  jointId: toInt(raw.shared_reading_id),
  friendId: raw.partner?.ID ?? cached?.friendId ?? "",
  friendName: raw.partner?.name ?? cached?.friendName ?? "",
  myPercent: toPercent(raw.my_percent),
  friendPercent: toPercent(raw.partner_percent),
  startedAt: raw.started_at ?? cached?.startedAt ?? new Date().toISOString(),
});

// GET /shared-readings 로 공동서재 목록을 받아 사본을 바꾼다. 실패하면 사본 그대로.
export const syncSharedLibrary = async () => {
  if (!isLoggedIn()) return [];
  const { ok, data } = await requestServer("GET", "/shared-readings");
  if (!ok) return getSharedLibrary();
  const cached = getSharedLibrary();
  const merged = await Promise.all(
    listOf(data).map((raw) => {
      const jointId = toInt(raw.shared_reading_id);
      return fillFromYes24(mergeServerJoint(raw, cached.find((b) => b.jointId === jointId)));
    })
  );
  write(KEYS.sharedLibrary, merged);
  return merged;
};

// 공동서재 상세: GET /library/joints/{joint_id}. 두 사람의 진행률. 실패하면 null
export const fetchJointDetail = async (record) => {
  if (!Number.isInteger(record?.jointId)) return null;
  const { ok, data } = await requestServer("GET", `/library/joints/${record.jointId}`);
  return ok && data ? mergeServerJoint(data, record) : null;
};

// 함께 읽기 만들기·초대: POST /shared-readings. 친구가 실제 사용자일 때만 서버가 성공을 돌려준다.
// 요청: { partnerUserId(친구 아이디), partnerName(친구 이름), bookId } — bookId 가 없으면 title·author·total_page·isbn 으로 책을 찾는다.
export const requestCoReading = async (friendId, friendName, book) =>
  (
    await requestServer("POST", "/shared-readings", {
      partnerUserId: friendId,
      partnerName: friendName,
      bookId: book?.serverBookId ?? null,
      title: book?.title,
      author: book?.author,
      total_page: book?.pages ?? book?.totalPage,
      isbn: book?.isbn,
    })
  ).ok;

// ───────── 감상문 ─────────
// 감상문: { day, content, date } 목록 (사본). 서버 값으로 맞추려면 syncCommentaries() 를 부른다.
// 나의 서재 책과 공동서재 책은 감상문이 따로라서 사본도 따로 둔다. (같은 책이 양쪽에 있어도 섞이지 않게)
//   나의 서재:  POST /bookstore/feelings { bookId, feeling_content }, GET /bookstore/feeling_page?bookID=
//   공동서재:   POST /shared-readings/{id}/reflections, GET /shared-readings/{id}/reflections?target=me|partner
const isJoint = (book) => Number.isInteger(book?.jointId);
const commentaryKey = (book, who = "me") => (isJoint(book) ? `joint-${book.jointId}-${who}` : book?.id);
export const getCommentaries = (book, who = "me") => (read(KEYS.commentaries, {})[commentaryKey(book, who)] ?? []);

// 공동서재 감상문을 받아 사본을 바꾼다. who: "me" | "partner". 실패하면 사본 그대로.
const syncJointReflections = async (book, who) => {
  if (!isLoggedIn()) return getCommentaries(book, who);
  const { ok, data } = await requestServer("GET", `/shared-readings/${book.jointId}/reflections?target=${who}`);
  if (!ok) return getCommentaries(book, who);
  const list = listOf(data)
    .map((r) => ({
      day: toInt(r.readingDay) ?? 1,
      content: r.content ?? "",
      date: r.createdAt ?? new Date().toISOString(),
      serverId: toInt(r.reflectionId),
    }))
    .sort((a, b) => b.day - a.day);
  write(KEYS.commentaries, { ...read(KEYS.commentaries, {}), [commentaryKey(book, who)]: list });
  return list;
};

// GET /bookstore/feeling_page?bookID= 로 이 책의 내 감상문을 받아 사본을 바꾼다. 실패하면 사본 그대로.
// 응답: { feelings: [{ feeling_id, day, feeling_content, date }] }
export const syncCommentaries = async (book, who = "me") => {
  if (isJoint(book)) return syncJointReflections(book, who);
  if (who !== "me") return [];
  if (!isLoggedIn() || !Number.isInteger(book?.serverBookId)) return getCommentaries(book);
  const { ok, data } = await requestServer("GET", `/bookstore/feeling_page?bookID=${book.serverBookId}`);
  if (!ok) return getCommentaries(book);
  const list = listOf(data, "feelings")
    .map((f) => ({
      day: toInt(f.day) ?? 1,
      content: f.feeling_content ?? "",
      date: f.date ?? new Date().toISOString(),
      serverId: toInt(f.feeling_id),
    }))
    .sort((a, b) => b.day - a.day);
  write(KEYS.commentaries, { ...read(KEYS.commentaries, {}), [commentaryKey(book)]: list });
  return list;
};

// 감상문을 쓴다. 백엔드(POST /bookstore/feelings { bookId, feeling_content } → feeling_id)가 받아줬을 때만 저장한다.
// 서버의 책 번호(serverBookId)를 모르는 책은 보낼 수 없어서 "error". "saved" | "error"
export const addCommentary = async (book, day, content) => {
  let ok;
  if (isJoint(book)) {
    ({ ok } = await requestServer("POST", `/shared-readings/${book.jointId}/reflections`, { content }));
  } else {
    if (!Number.isInteger(book.serverBookId)) return "error";
    ({ ok } = await requestServer("POST", "/bookstore/feelings", { bookId: book.serverBookId, feeling_content: content }));
  }
  if (!ok) return "error";
  const key = commentaryKey(book);
  const all = read(KEYS.commentaries, {});
  const list = (all[key] ?? []).filter((c) => c.day !== day); // 같은 일차는 하나만
  const next = [{ day, content, date: new Date().toISOString() }, ...list];
  return write(KEYS.commentaries, { ...all, [key]: next }) ? "saved" : "error";
};

// 시작일로부터 지난 날짜 수 (D+N). 자정 기준.
export const daysSince = (iso) => {
  if (!iso) return 0;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = startOfDay(new Date()) - startOfDay(new Date(iso));
  return Math.max(0, Math.round(diff / 86400000));
};

// ───────── 리뷰 / 별점 ─────────
// 책당 1인 1리뷰. 별점 평균은 리뷰가 없으면 5.0.
export const getReviews = (bookId) => (read(KEYS.reviews, {})[bookId] ?? []);

// 이 책의 리뷰 목록을 서버에서 받아 사본을 바꾼다: GET /books/{book_id}/reviews?page=N → { total, reviews: [{ reviewID, userID, content, rating }] }
// 백엔드는 한 번에 5개씩 주므로 total 만큼 모일 때까지 다음 쪽을 받는다 (안 그러면 6번째부터와 평균이 틀어진다).
// 서버 책 번호를 아는 책(서재에 담은 책)만 받을 수 있다. 없거나 실패하면 사본 그대로.
// 응답에 작성 날짜·이름이 없어서 아이디를 이름 자리에 쓰고 날짜는 비워 둔다.
const MAX_REVIEW_PAGES = 50; // 혹시 서버 total 이 이상해도 끝없이 요청하지 않게
export const syncReviews = async (book) => {
  const serverBookId = findInMyLibrary(book)?.serverBookId ?? book?.serverBookId;
  if (!Number.isInteger(serverBookId)) return getReviews(book?.id);
  const raws = [];
  for (let page = 1; page <= MAX_REVIEW_PAGES; page += 1) {
    const { ok, data } = await requestServer("GET", `/books/${serverBookId}/reviews?page=${page}`);
    if (!ok) return getReviews(book.id);
    const rows = Array.isArray(data?.reviews) ? data.reviews : [];
    raws.push(...rows);
    if (!rows.length || raws.length >= (Number(data?.total) || 0)) break;
  }
  const list = raws.map((r) => ({
    userKey: String(r.userID ?? ""),
    nickname: r.userID ?? "",
    reviewId: toInt(r.reviewID),
    rating: Number(r.rating) || 0,
    content: r.content ?? "",
    date: null,
  }));
  write(KEYS.reviews, { ...read(KEYS.reviews, {}), [book.id]: list });
  return list;
};

// 내 리뷰 등록: POST /books/reviews (bookID, content, rating) → review_id. 서버가 받아줬을 때만 저장한다.
// 이미 내 리뷰가 있으면 덮어쓰지 않고 null (수정은 updateMyReview). 실패해도 null. 성공하면 갱신된 목록.
// bookID 는 서버의 책 번호다(필수). 서재에 담지 않아 번호가 없는 책은 요청하지 않고 "need-library".
export const saveMyReview = async (book, { rating, content }) => {
  const bookId = book.id;
  const all = read(KEYS.reviews, {});
  const me = getMe();
  const list = all[bookId] ?? [];
  if (list.some((r) => r.userKey === me.key)) return null;
  const shelf = findInMyLibrary(book);
  // 백엔드는 bookID(서버의 책 번호)가 꼭 있어야 한다. 서재에 담지 않은 책은 번호가 없어서 요청하지 않는다.
  const serverBookId = shelf?.serverBookId ?? book.serverBookId ?? null;
  if (!Number.isInteger(serverBookId)) return "need-library";
  const { ok, data } = await requestServer("POST", "/books/reviews", { bookID: serverBookId, content, rating });
  if (!ok) return null;
  const review = {
    userKey: me.key,
    nickname: me.displayName,
    reviewId: toInt(data?.review_id ?? null),
    rating,
    content,
    date: new Date().toISOString(),
  };
  const next = [review, ...list];
  return write(KEYS.reviews, { ...all, [bookId]: next }) ? next : null;
};

// 내 리뷰 수정은 DB에 저장되어야 하므로 백엔드(PUT /books/reviews)가 성공했을 때만 화면 값을 바꾼다.
// 서버가 받아주지 않으면 null (브라우저에는 아무것도 저장하지 않는다).
export const updateMyReview = async (bookId, content) => {
  const all = read(KEYS.reviews, {});
  const me = getMe();
  const list = all[bookId] ?? [];
  const mine = list.find((r) => r.userKey === me.key);
  if (!mine) return null;
  const { ok } = await requestServer("PUT", "/books/reviews", { reviewID: mine.reviewId, content, rating: mine.rating });
  if (!ok) return null;
  const next = list.map((r) => (r.userKey === me.key ? { ...r, content } : r));
  return write(KEYS.reviews, { ...all, [bookId]: next }) ? next : null;
};

// 내 리뷰 삭제: DELETE /books/reviews?reviewID= . 서버가 성공했을 때만 지운다. 성공하면 갱신된 목록, 실패하면 null
export const deleteMyReview = async (bookId) => {
  const all = read(KEYS.reviews, {});
  const me = getMe();
  const list = all[bookId] ?? [];
  const mine = list.find((r) => r.userKey === me.key);
  if (!mine || !Number.isInteger(mine.reviewId)) return null;
  const { ok } = await requestServer("DELETE", `/books/reviews?reviewID=${mine.reviewId}`);
  if (!ok) return null;
  const next = list.filter((r) => r.userKey !== me.key);
  return write(KEYS.reviews, { ...all, [bookId]: next }) ? next : null;
};

export const summarizeReviews = (reviews) => ({
  count: reviews.length,
  average: reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5,
});
