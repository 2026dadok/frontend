// 홈 화면에서 쓰는 데이터 호출 모음. 퀘스트·XP·오늘의 문장은 백엔드 메인 페이지(GET /auth/main_page)에서 받는다.

import { fetchBestsellers } from "../bookSearch/bookSearchApi";
import { ensureAttendance } from "../../api/attendance";
import { syncMyLibrary, syncSharedLibrary } from "../bookSearch/bookStore";
import { getQuotes } from "../quote/quoteStore";
import { requestServer } from "../../api/client";

// ───────── 이달의 추천 도서 (YES24 Open API: 월별 베스트셀러) ─────────
// 눌렀을 때 책 상세 화면에 저자·소개가 필요해서, 책 검색 페이지와 같은 목록 호출(fetchBestsellers)을 쓴다.
// 키는 .env.local 의 YES24_API_KEY → vite.config.js 프록시가 X-Api-Key 헤더로 붙인다.
const RECOMMEND_COUNT = 6;

export const fetchRecommendedBooks = async () => {
  const { books } = await fetchBestsellers(1);
  return books.slice(0, RECOMMEND_COUNT);
};

// ───────── 나의 서재 / 공동 서재 ─────────
// 백엔드 GET /library/my_page, GET /shared-readings 를 받는다 (실패하면 브라우저의 사본).
// 형태: { id, title, cover, completed }
export const fetchMyLibraryBooks = () => syncMyLibrary();
export const fetchSharedLibraryBooks = () => syncSharedLibrary();

// ───────── 메인 페이지 (백엔드 GET /auth/main_page) ─────────
// 응답: { xp, daily_quest: [...], weekly_quest: { title, progress, target, reward_xp }, ... }
//   서재·공동서재·추천 도서·오늘의 문장은 백엔드가 아직 빈 값으로 준다 → 각자 API·YES24·인용구 노트로 채운다.
// 퀘스트가 무엇이고 달성했는지는 전부 백엔드가 판단한다. 프런트는 받은 값을 그대로 보여준다.
//   - 책 읽은 시간: 책 덮기 → POST /times
//   - 새 책 등록:   나의 서재 추가 → POST /library/books
//   - 출석:        src/api/attendance.js (POST /quests/attendance) 를 먼저 보낸 뒤 메인 페이지를 받는다

const getJson = async (path) => {
  const { ok, data } = await requestServer("GET", path);
  return ok && data && typeof data === "object" ? data : null;
};

const toWeekly = (w) =>
  w ? { title: w.title ?? "", current: Number(w.progress) || 0, goal: Number(w.target) || 0, xp: Number(w.reward_xp) || 0 } : null;

// 일일 퀘스트: GET /quests/daily → { quests: [{ id, title, xp, done }], allClearXp, allClearDone }
// (메인 페이지의 daily_quest 는 "전체 완료 보상"까지 한 줄로 섞여 있어서 이 API 를 쓴다)
const toDaily = (d) => ({
  quests: (d?.quests ?? []).map((q) => ({ id: q.id, title: q.title ?? "", xp: Number(q.xp) || 0, done: Boolean(q.done) })),
  allClearXp: d ? Number(d.allClearXp) || 0 : null,
});

// { weekly, daily, totalXp } — 서버가 없거나 실패하면 null
export const loadMainPage = async () => {
  await ensureAttendance(); // 출석을 먼저 알려야 일일 퀘스트에 출석 결과가 반영된다
  const [main, daily] = await Promise.all([getJson("/auth/main_page"), getJson("/quests/daily")]);
  if (!main) return null;
  return { weekly: toWeekly(main.weekly_quest), daily: toDaily(daily), totalXp: Number(main.xp) || 0 };
};

// 다른 화면 오른쪽 위의 총 XP. 메인 페이지 응답의 XP 를 쓴다 (XP 만 따로 주는 API 는 없다). 실패하면 null ("-" 로 보인다)
export const fetchTotalXp = async () => {
  const main = await getJson("/auth/main_page");
  return main ? Number(main.xp) || 0 : null;
};

// ───────── 오늘의 문장 (인용구 노트) ─────────
// 백엔드 메인 페이지의 오늘의 문장은 아직 비어 있어서 인용구 노트에서 하나를 고른다.
// 로그인하지 않았으면 없다(null). 형태: { text, author, book, ... }
export const fetchRandomQuote = () => {
  const list = getQuotes();
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
};
