// 홈 화면에서 쓰는 데이터 호출 모음.
// 아직 백엔드/다른 페이지가 없는 항목은 TODO + 빈 값(또는 더미)으로 둔다.

import { fetchBestsellers } from "../bookSearch/bookSearchApi";
import { ensureAttendance } from "../../api/attendance";
import { getMyLibrary, getSharedLibrary } from "../bookSearch/bookStore";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

const getJson = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
};

// ───────── 이달의 추천 도서 (YES24 Open API: 월별 베스트셀러) ─────────
// 눌렀을 때 책 상세 화면에 저자·소개가 필요해서, 책 검색 페이지와 같은 목록 호출(fetchBestsellers)을 쓴다.
// 키는 .env.local 의 YES24_API_KEY → vite.config.js 프록시가 X-Api-Key 헤더로 붙인다.
const RECOMMEND_COUNT = 6;

export const fetchRecommendedBooks = async () => {
  const { books } = await fetchBestsellers(1);
  return books.slice(0, RECOMMEND_COUNT);
};

// ───────── 나의 서재 / 공동 서재 ─────────
// 지금은 책 검색 페이지에서 담은 책(localStorage)을 읽는다.
// TODO: myLibrary, sharedLibrary 페이지·백엔드 완성 후 해당 데이터와 연결
// 형태: { id, title, cover, completed }
export const fetchMyLibraryBooks = async () => getMyLibrary();
export const fetchSharedLibraryBooks = async () => getSharedLibrary();

// ───────── 퀘스트 (백엔드) ─────────
// TODO: 백엔드 명세 확정 후 URL/응답 형태 맞추기
// weekly: { title, current, goal, xp }
// daily:  { quests: [{ id, title, xp, done }], allClearXp }
export const fetchWeeklyQuest = () =>
  getJson("/quests/weekly", { headers: authHeaders() });
export const fetchDailyQuests = () =>
  getJson("/quests/daily", { headers: authHeaders() });

// 퀘스트가 무엇이고 달성했는지는 전부 백엔드가 판단한다. 프런트는 사용자가 한 행동만 알려 주고,
// 홈에 들어올 때마다 목록을 다시 받아 백엔드가 준 done 값을 그대로 보여준다.
//   - 책 읽은 시간: 책 덮기 → addStudyTime (pages/timer/timerApi.js, PUT /times/edit_time)
//   - 새 책 등록:   나의 서재 추가 → POST /library/books (책 검색 페이지에서 이미 전송)
//   - 출석:        src/api/attendance.js (POST /quests/attendance, 프런트가 직접 보냄)

// 홈에서 쓰는 일일 퀘스트: 출석을 먼저 알린 뒤 목록을 받아 출석 결과까지 반영한다.
export const loadDailyQuests = async () => {
  await ensureAttendance();
  return fetchDailyQuests();
};

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
