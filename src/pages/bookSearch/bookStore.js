// 서재·공동서재·감상문·리뷰를 브라우저(localStorage)에 저장하는 임시 저장소.
// TODO: 백엔드 API가 준비되면 이 파일의 함수 내부만 API 호출로 바꾸면 된다.
//   - 나의 서재: POST /library/books 는 명세서가 bookID 인데 지금은 title, author, total_page 를 보낸다 (백엔드와 확인)
//   - 목록 조회: GET /library/my_page, /library/joints_page, /bookstore/feeling_page 로 교체
//   - 리뷰 등록: POST /books/reviews 로 교체

import { isLoggedIn, requestServer } from "../../api/client";

const KEYS = {
  user: "user", // 로그인 시 저장 (App.jsx)
  myLibrary: "myLibraryBooks",
  sharedLibrary: "sharedLibraryBooks",
  reviews: "bookReviews",
  adders: "bookAdders", // { [bookId]: [서재에 추가한 사람 key, ...] }
  commentaries: "bookCommentaries", // { [bookId]: [{ day, content, date }, ...] }
};

const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// ───────── 내 정보 ─────────
// 로그인할 때 저장한 내 정보 그대로. 로그인하지 않았으면 빈 객체
export const getSavedUser = () => (isLoggedIn() ? read(KEYS.user, {}) ?? {} : {});

// 로그인 응답(token 제외)을 App.jsx 가 "user" 에 저장해 둔다. 필드명은 nickname / name 을 기대한다.
export const getMe = () => {
  const user = read(KEYS.user, {}) ?? {};
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
  addedAt: new Date().toISOString(), // 감상문 화면의 'N일차' 계산 기준
  completed: false,
});

// 서재는 로그인한 사용자 것이다. 로그인하지 않았으면 브라우저에 남아 있는 책(예시로 넣어 본 책 등)은 보여주지 않는다.
export const getMyLibrary = () => (isLoggedIn() ? read(KEYS.myLibrary, []) : []);

// ───────── 서재에 추가한 사람 수 (상세 화면 별점 옆 숫자) ─────────
// 나의 서재/공동 서재 어느 쪽이든 추가한 사람을 한 번만 센다. (지금은 이 브라우저의 사용자들만)
// TODO: 백엔드가 책별 추가 인원 수를 내려주면 이 두 함수만 API 값으로 교체
const markAdded = (bookId) => {
  const all = read(KEYS.adders, {});
  const key = getMe().key;
  const list = all[bookId] ?? [];
  if (!list.includes(key)) write(KEYS.adders, { ...all, [bookId]: [...list, key] });
};

export const getAddedCount = (bookId) => {
  const people = new Set(read(KEYS.adders, {})[bookId] ?? []);
  // 이 기능이 생기기 전에 이미 서재에 넣어 둔 책도 내가 추가한 것으로 센다
  const inMine = getMyLibrary().some((b) => b.id === bookId);
  const inShared = getSharedLibrary().some((b) => b.id === bookId);
  if (inMine || inShared) people.add(getMe().key);
  return people.size;
};

// "added" | "exists" | "login" | "error"
// 로그인하지 않았으면 담지 않고 "login" 을 돌려준다.
// 백엔드(POST /library/books)에 먼저 등록해 보고, 안 되면 localStorage 에만 저장한다.
// 표지·출판사는 백엔드 명세에 없어서 서버 성공 여부와 상관없이 화면용으로 localStorage 에도 둔다.
export const addToMyLibrary = async (book) => {
  if (!isLoggedIn()) return "login";
  const list = getMyLibrary();
  if (list.some((b) => b.id === book.id)) return "exists";
  const { data } = await requestServer("POST", "/library/books", {
    title: book.title,
    author: book.author,
    total_page: book.pages,
  });
  // 백엔드 답변: 등록하면 book_id(정수 번호)를 돌려준다. 응답에서 어느 위치에 오는지는 확인 필요 (지금은 book_id / data.book_id / id 를 찾는다)
  const rawId = data?.book_id ?? data?.data?.book_id ?? data?.id ?? null;
  const serverBookId = rawId !== null && Number.isInteger(Number(rawId)) ? Number(rawId) : null;
  if (!write(KEYS.myLibrary, [{ ...toShelfBook(book), serverBookId }, ...list])) return "error";
  markAdded(book.id);
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
// 서버에 보내는 bookID 는 등록할 때 서버가 돌려준 정수 번호(book_id)다.
// 번호를 모르는 책은 서버에 삭제를 요청할 수 없어서 지우지 않는다.
// 삭제가 확인되면 "서재에 추가한 사람 수"(책 상세의 별점 옆 숫자)에서도 내가 빠진다.
export const removeFromMyLibrary = async (bookId) => {
  const list = getMyLibrary();
  const book = list.find((b) => b.id === bookId);
  if (!book) return "removed";
  if (!Number.isInteger(book.serverBookId)) return "error";
  const { ok } = await requestServer("DELETE", "/library/books", { bookID: book.serverBookId });
  if (!ok) return "error";
  if (!write(KEYS.myLibrary, list.filter((b) => b.id !== bookId))) return "error";
  const adders = read(KEYS.adders, {});
  const me = getMe().key;
  const stillShared = getSharedLibrary().some((b) => b.id === bookId);
  if (!stillShared && adders[bookId]) {
    write(KEYS.adders, { ...adders, [bookId]: adders[bookId].filter((k) => k !== me) });
  }
  return "removed";
};

// ───────── 공동 서재 ─────────
export const getSharedLibrary = () => (isLoggedIn() ? read(KEYS.sharedLibrary, []) : []); // 나의 서재와 같이 로그인해야 보인다

// 함께 읽기 요청. 명세서: POST /library/joints (joinID, name). 친구가 실제 사용자일 때만 서버가 성공을 돌려준다.
export const requestCoReading = async (friendId, friendName) =>
  (await requestServer("POST", "/library/joints", { joinID: friendId, name: friendName })).ok;

// 같은 책을 같은 친구와 다시 시작하면 기존 기록(시작일)을 그대로 쓴다. 저장 실패 시 null.
export const addToSharedLibrary = (book, friend) => {
  if (!isLoggedIn()) return null;
  const list = getSharedLibrary();
  const existing = list.find((b) => b.id === book.id && b.friendId === friend.id);
  if (existing) return existing;
  const record = {
    ...toShelfBook(book),
    friendId: friend.id,
    friendName: friend.name,
    startedAt: new Date().toISOString(),
  };
  if (!write(KEYS.sharedLibrary, [record, ...list])) return null;
  markAdded(book.id);
  return record;
};

// ───────── 감상문 ─────────
// 내 감상문: { day, content, date } 목록. TODO: 백엔드 연결 후 GET /bookstore/feeling_page 로 교체
export const getCommentaries = (bookId) => (read(KEYS.commentaries, {})[bookId] ?? []);

// 감상문을 쓴다. 백엔드(POST /bookstore/feelings: bookID, feeling_content → feeling_id, new_achievements)에 먼저 보내고,
// 서버가 없거나 실패해도 화면에 보이도록 브라우저에도 저장한다. "saved" | "error"
// (서버의 책 번호(serverBookId)를 모르는 책은 서버에 보내지 않고 브라우저에만 저장한다)
// TODO: 백엔드가 준비되면 서버 실패 시 저장하지 않는 쪽으로 바꿀지 정한다
export const addCommentary = async (book, day, content) => {
  if (Number.isInteger(book.serverBookId)) {
    await requestServer("POST", "/bookstore/feelings", { bookID: book.serverBookId, feeling_content: content });
  }
  const all = read(KEYS.commentaries, {});
  const list = (all[book.id] ?? []).filter((c) => c.day !== day); // 같은 일차는 하나만
  const next = [{ day, content, date: new Date().toISOString() }, ...list];
  return write(KEYS.commentaries, { ...all, [book.id]: next }) ? "saved" : "error";
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

// 내 리뷰 등록. 이미 내 리뷰가 있으면 덮어쓰지 않고 null (수정은 updateMyReview → 백엔드만).
// 저장 실패 시에도 null. 성공하면 갱신된 목록을 돌려준다.
// TODO: POST /books/reviews (bookID, content, rating) 로 교체하고, 응답의 review_id 를 reviewId 에 저장한다 (수정·삭제에 필요)
export const saveMyReview = (bookId, { rating, content }) => {
  const all = read(KEYS.reviews, {});
  const me = getMe();
  const list = all[bookId] ?? [];
  if (list.some((r) => r.userKey === me.key)) return null;
  const review = {
    userKey: me.key,
    nickname: me.displayName,
    reviewId: null,
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

export const summarizeReviews = (reviews) => ({
  count: reviews.length,
  average: reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5,
});
