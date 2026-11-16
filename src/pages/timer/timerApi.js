// 타이머(책 읽기) 관련 백엔드 호출.
// 타이머 페이지(Timer.jsx)에서 사용한다.
//
// 일일 퀘스트 "30분 독서하기" 같은 퀘스트는 프런트가 판단하지 않는다.
// 읽은 시간만 보내면 백엔드가 오늘 읽은 시간을 합쳐서 퀘스트 달성 여부를 계산하고,
// 홈의 퀘스트 목록(GET /quests/daily)에 done 값으로 내려준다.

import { authHeaders, requestServer } from "../../api/client";

// 이번에 읽은 시간을 백엔드에 보낸다. 명세서: POST /times (bookID, readTime) → message, today_readtime
// 명세서 비고: readTime 은 초 단위(1초 ~ 6시간), 하루 합계가 24시간을 넘으면 400. today_readtime 은 오늘 합계(초).
// bookID 는 데이터베이스에 저장된 책의 고유 번호(서재에 담을 때 서버가 준 book_id)다.
// TODO: 키 이름이 명세서 표(readtime)와 비고(readTime)에서 다르다. 백엔드 확인 전까지 두 이름 모두 보낸다.
const MAX_READ_SECONDS = 6 * 3600;
export const addStudyTime = async (bookID, seconds) => {
  if (!Number.isInteger(bookID) || !Number.isInteger(seconds) || seconds <= 0) return null;
  const readTime = Math.min(seconds, MAX_READ_SECONDS);
  try {
    const res = await fetch("/times", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ bookID, readTime, readtime: readTime }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return { todayReadtime: data?.today_readtime ?? null }; // 초
  } catch {
    return null;
  }
};

// 타이머 첫 화면의 목표 시간. 명세서: GET /times/timer_page → goal_readtime, today_readtime
// 목표 시간은 시·분만 쓴다 ("HH:MM"). 서버가 없거나 실패하면 30분으로 시작한다.
// 명세서 비고: goal_readtime 은 초 단위 숫자. ("HH:MM" 문자열로 와도 받는다)
const DEFAULT_GOAL = "00:30";
export const fetchGoalTime = async () => {
  const { ok, data } = await requestServer("GET", "/times/timer_page");
  const raw = ok ? (data?.data ?? data)?.goal_readtime : null;
  const seconds = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
  if (typeof seconds === "number" && seconds > 0) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (typeof raw === "string" && /^\d{1,2}:\d{1,2}/.test(raw)) {
    return raw.split(":").slice(0, 2).map((v) => v.padStart(2, "0")).join(":");
  }
  return DEFAULT_GOAL;
};

// 오늘 어디까지 읽었는지 보낸다. 명세서: PUT /library/pages (bookID, read_pages)
//   → read_page, percent, finished, completed_quests, gained_xp, joint_result, new_achievements
// 성공하면 응답, 실패하면 null
export const saveReadPages = async (bookID, readPages) => {
  if (!Number.isInteger(bookID)) return null;
  const { ok, data } = await requestServer("PUT", "/library/pages", { bookID, read_pages: readPages });
  return ok ? (data?.data ?? data ?? {}) : null;
};

// 서고의 독서 달력(libraryApi.fetchReadingLog)이 읽는 날짜별 읽은 시간(분)에 오늘 읽은 시간을 더한다.
// TODO: 날짜별 독서 시간 API가 생기면 지운다 (지금은 백엔드 없이도 달력에 보이게 브라우저에 쌓는다)
export const addToReadingLog = (minutes) => {
  if (minutes <= 0) return;
  try {
    const log = JSON.parse(localStorage.getItem("readingLog")) ?? {};
    const today = new Date().toLocaleDateString("sv-SE");
    log[today] = (log[today] ?? 0) + minutes;
    localStorage.setItem("readingLog", JSON.stringify(log));
  } catch {
    // 저장 공간 문제 등은 넘어간다
  }
};
