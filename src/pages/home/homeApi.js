// 홈 화면에서 쓰는 데이터 호출 모음.
// 아직 백엔드/다른 페이지가 없는 항목은 TODO + 빈 값(또는 더미)으로 둔다.

const BOOK_API_BASE = import.meta.env.VITE_BOOK_API_BASE ?? ""; // TODO: 책 API 주소 (.env에 입력)
const BOOK_API_KEY = import.meta.env.VITE_BOOK_API_KEY ?? ""; // TODO: 책 API 키 (.env에 입력)

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

const getJson = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
};

// ───────── 이달의 추천 도서 (외부 책 API) ─────────
// 화면은 { id, title, cover } 형태만 사용한다.
const toBook = (item) => ({
  id: item.id ?? item.itemId ?? item.isbn,      // TODO: 실제 응답 필드명으로 수정
  title: item.title,                             // TODO
  cover: item.cover ?? item.coverUrl ?? item.image, // TODO
});

export const fetchRecommendedBooks = async () => {
  if (!BOOK_API_BASE || !BOOK_API_KEY) return [];
  // TODO: 실제 엔드포인트/쿼리 파라미터/응답 구조에 맞게 수정
  const data = await getJson(`${BOOK_API_BASE}?key=${BOOK_API_KEY}&count=6`);
  return (data.items ?? []).slice(0, 6).map(toBook);
};

// ───────── 나의 서재 / 공동 서재 ─────────
// TODO: myLibrary, sharedLibrary 페이지 완성 후 해당 데이터와 연결
// 형태: { id, title, cover, completed }
export const fetchMyLibraryBooks = async () => [];
export const fetchSharedLibraryBooks = async () => [];

// ───────── 퀘스트 (백엔드) ─────────
// TODO: 백엔드 명세 확정 후 URL/응답 형태 맞추기
// weekly: { title, current, goal, xp }
// daily:  { quests: [{ id, title, xp, done }], allClearXp }
export const fetchWeeklyQuest = () =>
  getJson("/quests/weekly", { headers: authHeaders() });
export const fetchDailyQuests = () =>
  getJson("/quests/daily", { headers: authHeaders() });

// ───────── 총 XP ─────────
// TODO: 백엔드 연결 (예: /users/me/xp)
export const fetchTotalXp = async () => 0;

// ───────── 오늘의 문장 (인용구 노트) ─────────
// TODO: quote 페이지 완성 후 저장 방식에 맞게 교체. 지금은 localStorage "quotes" 사용
// 형태: { text, author, book }
export const fetchRandomQuote = () => {
  try {
    const list = JSON.parse(localStorage.getItem("quotes") ?? "[]");
    if (!Array.isArray(list) || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  } catch {
    return null;
  }
};
