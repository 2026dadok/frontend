// 책 검색 페이지가 쓰는 임시 저장소 (localStorage).
// TODO: 백엔드 API가 준비되면 이 파일의 함수 내부만 API 호출로 바꾸면 된다.
//   - 나의 서재: POST /library/books (title, author, total_page)
//   - 공동서재:  POST /library/joints (target_user_id)
//   - 리뷰/별점: 리뷰 조회·등록 API (명세서에 아직 없음)

const KEYS = {
  user: "user", // 로그인 시 저장 (App.jsx)
  myLibrary: "myLibraryBooks",
  sharedLibrary: "sharedLibraryBooks",
  reviews: "bookReviews",
  adders: "bookAdders", // { [bookId]: [서재에 추가한 사람 key, ...] }
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

// ───────── 백엔드 호출 ─────────
// 백엔드가 아직 개발 중이라, 호출이 실패하면 화면이 멈추지 않게 false 를 돌려주고 호출한 쪽이 대체 동작을 한다.
// TODO: 인증 방식(Bearer 토큰 / 세션)은 백엔드 확정 후 확인
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

const postToServer = async (url, body) => {
  try {
    const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
    return res.ok;
  } catch {
    return false;
  }
};

// ───────── 내 정보 ─────────
// 로그인 응답(token 제외)을 App.jsx 가 "user" 에 저장해 둔다. 필드명은 nickname / name 을 기대한다.
export const getMe = () => {
  const user = read(KEYS.user, {}) ?? {};
  return {
    key: String(user.name ?? user.id ?? "me"), // 리뷰 작성자 구분용
    displayName: user.nickname || user.name || "나",
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
  completed: false,
});

export const getMyLibrary = () => read(KEYS.myLibrary, []);

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

// "added" | "exists" | "error"
// 백엔드(POST /library/books)에 먼저 등록해 보고, 안 되면 localStorage 에만 저장한다.
// 표지·출판사는 백엔드 명세에 없어서 서버 성공 여부와 상관없이 화면용으로 localStorage 에도 둔다.
export const addToMyLibrary = async (book) => {
  const list = getMyLibrary();
  if (list.some((b) => b.id === book.id)) return "exists";
  await postToServer("/library/books", {
    title: book.title,
    author: book.author,
    total_page: book.pages,
  });
  if (!write(KEYS.myLibrary, [toShelfBook(book), ...list])) return "error";
  markAdded(book.id);
  return "added";
};

// ───────── 공동 서재 ─────────
export const getSharedLibrary = () => read(KEYS.sharedLibrary, []);

// 함께 읽기 요청 (POST /library/joints). 친구가 실제 사용자일 때만 서버가 성공을 돌려준다.
// TODO: target_user_id 가 로그인 아이디(name)인지 숫자 id 인지 백엔드와 확인
export const requestCoReading = (friendId) => postToServer("/library/joints", { target_user_id: friendId });

// 같은 책을 같은 친구와 다시 시작하면 기존 기록(시작일)을 그대로 쓴다. 저장 실패 시 null.
export const addToSharedLibrary = (book, friend) => {
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

// 내 리뷰를 등록하거나(없으면) 수정(있으면)한 뒤 갱신된 목록을 돌려준다. 저장 실패 시 null.
export const saveMyReview = (bookId, { rating, content }) => {
  const all = read(KEYS.reviews, {});
  const me = getMe();
  const list = all[bookId] ?? [];
  const review = {
    userKey: me.key,
    nickname: me.displayName,
    rating,
    content,
    date: new Date().toISOString(),
  };
  const next = list.some((r) => r.userKey === me.key)
    ? list.map((r) => (r.userKey === me.key ? review : r))
    : [review, ...list];
  return write(KEYS.reviews, { ...all, [bookId]: next }) ? next : null;
};

export const summarizeReviews = (reviews) => ({
  count: reviews.length,
  average: reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5,
});
