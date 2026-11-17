// 타이머(책 읽기) 관련 백엔드 호출.
// 타이머 페이지(Timer.jsx)에서 사용한다.
//
// 일일 퀘스트 "30분 독서하기" 같은 퀘스트는 프런트가 판단하지 않는다.
// 읽은 시간만 보내면 백엔드가 오늘 읽은 시간을 합쳐서 퀘스트 달성 여부를 계산하고,
// 홈의 퀘스트 목록(GET /quests/daily)에 done 값으로 내려준다.

import { requestServer } from "../../api/client";

// 이번에 읽은 시간을 백엔드에 보낸다: POST /times (bookID, readTime) → message, today_readtime
// readTime 은 초 단위(1초 ~ 6시간). bookID 는 서재에 담을 때 서버가 준 책 번호(book_id)다. 성공하면 true
const MAX_READ_SECONDS = 6 * 3600;
export const addStudyTime = async (bookID, seconds) => {
  if (!Number.isInteger(bookID) || !Number.isInteger(seconds) || seconds <= 0) return false;
  const readTime = Math.min(seconds, MAX_READ_SECONDS);
  return (await requestServer("POST", "/times", { bookID, readTime })).ok;
};

// 타이머 첫 화면의 목표 시간: GET /times/timer_page → goal_readtime(분), today_readtime(초)
// "HH:MM" 로 바꿔 쓴다. 서버가 없거나 실패하면 30분으로 시작한다.
const DEFAULT_GOAL = "00:30";
export const fetchGoalTime = async () => {
  const { ok, data } = await requestServer("GET", "/times/timer_page");
  const minutes = ok ? Number(data?.goal_readtime) : 0;
  if (!(minutes > 0)) return DEFAULT_GOAL;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

// 오늘 어디까지 읽었는지 보낸다. 성공하면 true
//   나의 서재 책: PUT /library/pages (bookID, read_pages)
//   공동서재 책(jointId 가 있는 책): PUT /shared-readings/{id}/progress (currentPage)
export const saveReadPages = async (book, readPages) => {
  if (Number.isInteger(book?.jointId)) {
    return (await requestServer("PUT", `/shared-readings/${book.jointId}/progress`, { currentPage: readPages })).ok;
  }
  if (!Number.isInteger(book?.serverBookId)) return false;
  return (await requestServer("PUT", "/library/pages", { bookID: book.serverBookId, read_pages: readPages })).ok;
};
