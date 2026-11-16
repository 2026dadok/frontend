// 홈 화면에서 쓰는 데이터 호출 모음. 퀘스트·XP·오늘의 문장은 백엔드 메인 페이지(GET /auth/main_page)에서 받는다.

import { fetchBestsellers } from "../bookSearch/bookSearchApi";
import { ensureAttendance } from "../../api/attendance";
import { syncMyLibrary, syncSharedLibrary } from "../bookSearch/bookStore";
import { getQuotes } from "../quote/quoteStore";
import { pick, requestServer } from "../../api/client";

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
// 명세서: 메인 페이지 한 번에 퀘스트·XP·서재·공동서재·추천 도서·오늘의 문장을 준다.
//   비고: 서재·공동서재·추천 도서·오늘의 문장은 해당 기능 연결 전까지 빈 값.
// 명세서에 안쪽 필드 이름이 없어서 여러 후보 이름을 받는다. TODO: 백엔드가 필드 이름을 정하면 하나로 줄인다.
// 퀘스트가 무엇이고 달성했는지는 전부 백엔드가 판단한다. 프런트는 받은 done 값을 그대로 보여준다.
//   - 책 읽은 시간: 책 덮기 → POST /times
//   - 새 책 등록:   나의 서재 추가 → POST /library/books
//   - 출석:        src/api/attendance.js (POST /quests/attendance) 를 먼저 보낸 뒤 메인 페이지를 받는다

const firstArray = (...candidates) => candidates.find(Array.isArray);

const toWeekly = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    title: pick(raw, "title", "quest_name", "name", "content") ?? "",
    current: Number(pick(raw, "current", "progress", "now", "current_value")) || 0,
    goal: Number(pick(raw, "goal", "target", "goal_value")) || 0,
    xp: Number(pick(raw, "xp", "reward_xp")) || 0,
  };
};

const toDailyQuest = (raw, i) => ({
  id: pick(raw, "id", "quest_id", "questID") ?? i,
  title: pick(raw, "title", "quest_name", "name", "content") ?? "",
  xp: Number(pick(raw, "xp", "reward_xp")) || 0,
  done: Boolean(pick(raw, "done", "completed", "is_completed", "achieved")),
});

const toQuote = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const text = pick(raw, "note_content", "text", "content", "quote");
  return text ? { text, book: pick(raw, "title", "book_title", "book") ?? "", author: pick(raw, "author") ?? "" } : null;
};

// { weekly, daily, totalXp, quote } — 서버가 없거나 실패하면 null
// (서재·공동서재는 각자 API(GET /library/my_page, /shared-readings)로 받는다)
const requestMainPage = async () => {
  const { ok, data } = await requestServer("GET", "/auth/main_page");
  return ok && data && typeof data === "object" ? data.data ?? data : null;
};
const xpOf = (d) => Number(pick(d, "total_xp", "xp", "user_xp", "all_xp")) || 0;

export const loadMainPage = async () => {
  await ensureAttendance(); // 출석을 먼저 알려야 일일 퀘스트에 출석 결과가 반영된다
  const d = await requestMainPage();
  if (!d) return null;
  const quests = d.quests ?? {};
  const dailyRaw = d.daily_quests ?? d.daily_quest ?? d.daily ?? quests.daily;
  const dailyList = firstArray(dailyRaw, dailyRaw?.quests, dailyRaw?.list) ?? [];
  return {
    weekly: toWeekly(d.weekly_quest ?? d.weekly ?? quests.weekly),
    daily: {
      quests: dailyList.map(toDailyQuest),
      allClearXp: Number(pick(dailyRaw ?? {}, "all_clear_xp", "allClearXp", "bonus_xp") ?? pick(d, "all_clear_xp", "daily_bonus_xp")) || 0,
    },
    totalXp: xpOf(d),
    quote: toQuote(d.today_quote ?? d.quote ?? d.today_sentence),
  };
};

// 다른 화면 오른쪽 위의 총 XP. 메인 페이지 응답의 XP 를 쓴다 (명세서에 XP 만 따로 주는 API 는 없다). 실패하면 0
export const fetchTotalXp = async () => {
  const d = await requestMainPage();
  return d ? xpOf(d) : 0;
};

// ───────── 오늘의 문장 (인용구 노트) ─────────
// 메인 페이지가 오늘의 문장을 주지 않을 때(명세서: 기능 연결 전까지 빈 값) 인용구 노트에서 하나를 고른다.
// 로그인하지 않았으면 없다(null). 형태: { text, author, book, ... }
export const fetchRandomQuote = () => {
  const list = getQuotes();
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
};
