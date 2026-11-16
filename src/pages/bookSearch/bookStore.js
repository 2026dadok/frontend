// 서재·공동서재·감상문·리뷰 데이터. 목록의 기준은 백엔드이고, 메모리에 화면용 사본을 둔다 (브라우저 저장소에는 남기지 않는다).
//   - 나의 서재 목록: GET /library/my_page      → syncMyLibrary() 가 받아서 사본을 바꾼다
//   - 공동서재 목록:  GET /shared-readings      → syncSharedLibrary()
//   - 공동서재 상세:  GET /library/joints/{id}  → fetchJointDetail()
//   - 공동서재 만들기·초대: POST /shared-readings → requestCoReading()
//   - 감상문:        GET /bookstore/feeling_page, POST /bookstore/feelings
//   - 리뷰:          POST /books/reviews, PUT /books/reviews, DELETE /books/reviews?reviewID=
// 표지·출판사·책 소개는 명세서의 책 데이터에 없어서 사본에 같이 둔다 (서버 목록에 없으면 YES24 에서 찾아 채운다).
// TODO: 명세서에 안쪽 필드 이름이 없어서 여러 후보 이름을 받는다. 백엔드가 이름을 정하면 하나로 줄인다.

import { isLoggedIn, pick, requestServer } from "../../api/client";
import { getSessionUser, memRead, memWrite } from "../../api/session";
import { searchBooks } from "./bookSearchApi";

const KEYS = {
  myLibrary: "myLibraryBooks",
  sharedLibrary: "sharedLibraryBooks",
  reviews: "bookReviews",
  adders: "bookAdders", // { [bookId]: [서재에 추가한 사람 key, ...] }
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
  addedAt: new Date().toISOString(), // 감상문 화면의 'N일차' 계산 기준
  completed: false,
});

// 서재는 로그인한 사용자 것이다. 로그인하지 않았으면 브라우저에 남아 있는 책(예시로 넣어 본 책 등)은 보여주지 않는다.
// 바로 그릴 때 쓰는 사본. 서버 값으로 맞추려면 syncMyLibrary() 를 부른다.
export const getMyLibrary = () => (isLoggedIn() ? read(KEYS.myLibrary, []) : []);

// ───────── 서버 목록 받아서 사본 맞추기 ─────────
const toInt = (v) => (v !== null && v !== "" && Number.isInteger(Number(v)) ? Number(v) : null);
const listOf = (data, ...keys) =>
  [data, data?.data, ...keys.flatMap((k) => [data?.[k], data?.data?.[k]])].find(Array.isArray) ?? [];

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
const mergeServerBook = (raw, cached) => {
  const book = raw?.book && typeof raw.book === "object" ? { ...raw.book, ...raw } : raw;
  const serverBookId = toInt(pick(book, "book_id", "bookID", "bookId"));
  const totalPage = toInt(pick(book, "total_page", "total_pages", "totalPage")) ?? cached?.totalPage ?? null;
  const readPage = toInt(pick(book, "read_page", "read_pages", "readPage")) ?? cached?.readPage ?? 0;
  return {
    ...cached,
    id: cached?.id ?? (serverBookId !== null ? `server-${serverBookId}` : String(pick(book, "id") ?? "")),
    serverBookId,
    title: pick(book, "title", "book_title") ?? cached?.title ?? "",
    author: pick(book, "author") ?? cached?.author ?? "",
    cover: pick(book, "cover_url", "cover", "image") ?? cached?.cover ?? "",
    totalPage,
    readPage,
    completed: Boolean(pick(book, "finished", "completed", "is_finished")) || (totalPage ? readPage >= totalPage : false),
    addedAt: pick(book, "created_at", "added_at", "start_date") ?? cached?.addedAt ?? new Date().toISOString(),
  };
};

// GET /library/my_page 로 나의 서재를 받아 사본을 서버 값으로 바꾼다. 서버가 없거나 실패하면 사본 그대로.
export const syncMyLibrary = async () => {
  if (!isLoggedIn()) return [];
  const { ok, data } = await requestServer("GET", "/library/my_page");
  if (!ok) return getMyLibrary();
  const cached = getMyLibrary();
  const merged = await Promise.all(
    listOf(data, "books", "my_library", "library").map((raw) => {
      const id = toInt(pick(raw?.book ?? raw, "book_id", "bookID", "bookId") ?? pick(raw, "book_id", "bookID"));
      return fillFromYes24(mergeServerBook(raw, cached.find((b) => b.serverBookId === id)));
    })
  );
  write(KEYS.myLibrary, merged);
  return merged;
};

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
// 백엔드(POST /library/books)가 받아줬을 때만 담는다. 표지·출판사는 백엔드 명세에 없어서 메모리 사본에 같이 둔다.
// TODO: 책 추가의 요청 값 이름이 명세서에 없다. 지금은 title, author, total_page 에 isbn·표지 주소를 같이 보낸다
export const addToMyLibrary = async (book) => {
  if (!isLoggedIn()) return "login";
  const list = getMyLibrary();
  if (list.some((b) => b.id === book.id)) return "exists";
  const { ok, data } = await requestServer("POST", "/library/books", {
    title: book.title,
    author: book.author,
    total_page: book.pages,
    isbn: book.isbn,
    cover_url: book.cover,
  });
  if (!ok) return "error"; // 서재는 서버에 저장되어야 한다 (브라우저에만 담지 않는다)
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
  // 명세서: DELETE /library/books/{book_id} (아직 미완료로 표시됨)
  const { ok } = await requestServer("DELETE", `/library/books/${book.serverBookId}`);
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

// 공동서재 한 개: { id(책), jointId, title, cover, friendId, friendName, myPercent, friendPercent, startedAt, ... }
const toPercent = (v) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)));
const mergeServerJoint = (raw, cached) => {
  const partner = raw.partner ?? raw.friend ?? raw.member ?? {};
  const book = mergeServerBook(raw.book ?? raw, cached);
  return {
    ...book,
    jointId: toInt(pick(raw, "joint_id", "shared_reading_id", "jointID", "id")),
    friendId: pick(partner, "ID", "user_id", "id") ?? pick(raw, "partner_id", "friend_id", "joinID") ?? cached?.friendId ?? "",
    friendName: pick(partner, "name", "user_name", "nickname") ?? pick(raw, "partner_name", "friend_name") ?? cached?.friendName ?? "",
    friendImage: pick(partner, "profile_image", "image_url") ?? "",
    myPercent: toPercent(pick(raw, "my_percent", "my_progress", "percent")),
    friendPercent: toPercent(pick(raw, "partner_percent", "friend_percent", "partner_progress")),
    startedAt: pick(raw, "started_at", "start_date", "created_at") ?? cached?.startedAt ?? new Date().toISOString(),
  };
};

// GET /shared-readings 로 공동서재 목록을 받아 사본을 바꾼다. 실패하면 사본 그대로.
export const syncSharedLibrary = async () => {
  if (!isLoggedIn()) return [];
  const { ok, data } = await requestServer("GET", "/shared-readings");
  if (!ok) return getSharedLibrary();
  const cached = getSharedLibrary();
  const merged = await Promise.all(
    listOf(data, "shared_readings", "joints", "list").map((raw) => {
      const jointId = toInt(pick(raw, "joint_id", "shared_reading_id", "jointID", "id"));
      return fillFromYes24(mergeServerJoint(raw, cached.find((b) => b.jointId === jointId)));
    })
  );
  write(KEYS.sharedLibrary, merged);
  return merged;
};

// 공동서재 상세: GET /library/joints/{joint_id}. 두 사람의 진행률·승리 보상 등. 실패하면 null
export const fetchJointDetail = async (record) => {
  if (!Number.isInteger(record?.jointId)) return null;
  const { ok, data } = await requestServer("GET", `/library/joints/${record.jointId}`);
  if (!ok || !data) return null;
  const d = data.data ?? data;
  return { ...mergeServerJoint(d, record), rewardXp: Number(pick(d, "reward_xp", "win_xp", "gained_xp")) || 0 };
};

// 함께 읽기 만들기·초대. 명세서: POST /shared-readings. 친구가 실제 사용자일 때만 서버가 성공을 돌려준다.
// TODO: 요청 값 이름이 명세서에 없다. 지금은 친구 아이디(joinID), 이름, 책 정보를 보낸다
export const requestCoReading = async (friendId, friendName, book) =>
  (
    await requestServer("POST", "/shared-readings", {
      joinID: friendId,
      name: friendName,
      bookID: book?.serverBookId ?? null,
      title: book?.title,
      author: book?.author,
      total_page: book?.pages ?? book?.totalPage,
      isbn: book?.isbn,
    })
  ).ok;

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
// 내 감상문: { day, content, date } 목록 (사본). 서버 값으로 맞추려면 syncCommentaries() 를 부른다.
export const getCommentaries = (bookId) => (read(KEYS.commentaries, {})[bookId] ?? []);

// GET /bookstore/feeling_page?bookID= 로 이 책의 내 감상문을 받아 사본을 바꾼다. 실패하면 사본 그대로.
// 일차(day)가 응답에 없으면 책을 담은 날부터 쓴 날까지의 날짜 수로 계산한다.
// TODO: 요청 값(bookID)과 응답 필드 이름이 명세서에 없다. 백엔드가 정하면 맞춘다.
export const syncCommentaries = async (book) => {
  if (!isLoggedIn() || !Number.isInteger(book?.serverBookId)) return getCommentaries(book?.id);
  const { ok, data } = await requestServer("GET", `/bookstore/feeling_page?bookID=${book.serverBookId}`);
  if (!ok) return getCommentaries(book.id);
  const start = book.startedAt ?? book.addedAt;
  const list = listOf(data, "feelings", "list")
    .map((f) => {
      const date = pick(f, "date", "created_at", "write_date") ?? new Date().toISOString();
      const dayRaw = toInt(pick(f, "day", "day_count"));
      const day = dayRaw ?? (start ? Math.max(1, Math.round((new Date(date) - new Date(start)) / 86400000) + 1) : 1);
      return { day, content: pick(f, "feeling_content", "content") ?? "", date, serverId: toInt(pick(f, "feeling_id", "id")) };
    })
    .sort((a, b) => b.day - a.day);
  write(KEYS.commentaries, { ...read(KEYS.commentaries, {}), [book.id]: list });
  return list;
};

// 감상문을 쓴다. 백엔드(POST /bookstore/feelings: bookID, feeling_content → feeling_id, new_achievements)가 받아줬을 때만 저장한다.
// 서버의 책 번호(serverBookId)를 모르는 책은 보낼 수 없어서 "error". "saved" | "error"
export const addCommentary = async (book, day, content) => {
  if (!Number.isInteger(book.serverBookId)) return "error";
  const { ok } = await requestServer("POST", "/bookstore/feelings", { bookID: book.serverBookId, feeling_content: content });
  if (!ok) return "error";
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

// 내 리뷰 등록: POST /books/reviews (bookID, content, rating) → review_id. 서버가 받아줬을 때만 저장한다.
// 이미 내 리뷰가 있으면 덮어쓰지 않고 null (수정은 updateMyReview). 실패해도 null. 성공하면 갱신된 목록.
// bookID 는 서버의 책 번호다. 서재에 담지 않은 책은 번호가 없어서 제목·저자·ISBN 을 같이 보낸다.
// TODO: 리뷰 목록(GET /books/{book_id}/reviews)은 아직 미완료라 다른 사람 리뷰는 아직 못 받는다.
export const saveMyReview = async (book, { rating, content }) => {
  const bookId = book.id;
  const all = read(KEYS.reviews, {});
  const me = getMe();
  const list = all[bookId] ?? [];
  if (list.some((r) => r.userKey === me.key)) return null;
  const shelf = getMyLibrary().find((b) => b.id === bookId);
  const { ok, data } = await requestServer("POST", "/books/reviews", {
    bookID: shelf?.serverBookId ?? book.serverBookId ?? null,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    content,
    rating,
  });
  if (!ok) return null;
  const review = {
    userKey: me.key,
    nickname: me.displayName,
    reviewId: toInt(pick(data?.data ?? data ?? {}, "review_id", "reviewID", "id")),
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
