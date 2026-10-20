// 홈 화면에서 쓰는 데이터 호출 모음.
// 아직 백엔드/다른 페이지가 없는 항목은 TODO + 빈 값(또는 더미)으로 둔다.

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

const getJson = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
};

// ───────── 이달의 추천 도서 (YES24 Open API: 월별 베스트셀러) ─────────
// 문서: https://developers.yes24.com/api-doc/category-bestseller-monthly
// 키는 .env.local 의 YES24_API_KEY → vite.config.js 프록시가 X-Api-Key 헤더로 붙인다.
const YES24_BOOK_CATEGORY_ID = "001"; // 국내도서 (문서 예시 값, 필요하면 카테고리 목록 API로 확인)
const RECOMMEND_COUNT = 6;

// 화면은 { id, title, cover } 형태만 사용한다.
const toBook = (item) => ({
  id: item.itemId,
  title: item.title,
  cover: item.cover,
});

export const fetchRecommendedBooks = async () => {
  const params = new URLSearchParams({
    categoryId: YES24_BOOK_CATEGORY_ID,
    pageSize: String(RECOMMEND_COUNT * 2), // 성인물 제외하고도 6권이 남도록 여유 있게
  });
  const json = await getJson(`/yes24/v1/category/bestsellerMonthly?${params}`);
  return (json.data?.items ?? [])
    .filter((item) => item.adultYn !== "Y")
    .slice(0, RECOMMEND_COUNT)
    .map(toBook);
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
