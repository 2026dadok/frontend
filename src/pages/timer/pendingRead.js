// 저장하지 못한 독서 기록(시간·쪽수)을 잠시 보관한다.
// 타이머로 읽는 동안 로그인이 만료되면 저장 요청이 실패하고 로그인 화면으로 넘어가는데,
// 그 기록을 이 탭의 sessionStorage 에 두었다가 같은 계정으로 다시 로그인하면 보낸다.
import { tokenUserId } from "../../api/session";
import { addStudyTime, saveReadPages } from "./timerApi";

const KEY = "dadok.pendingRead";
// 보관 기록은 같은 날, 이 시간 안에 다시 로그인했을 때만 보낸다
// (서버는 받은 날짜로 저장하므로 날짜가 바뀌면 다른 날 기록이 된다)
const MAX_AGE_MS = 3 * 60 * 60 * 1000;
const isFresh = (savedAt) => {
  const saved = new Date(savedAt);
  const now = new Date();
  return !Number.isNaN(saved.getTime()) && now - saved <= MAX_AGE_MS && saved.toDateString() === now.toDateString();
};

const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
};
const write = (record) => {
  try {
    if (record) sessionStorage.setItem(KEY, JSON.stringify(record));
    else sessionStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 브라우저에서는 보관하지 않는다
  }
};

// { bookId, jointId, seconds, readPage } 를 보관한다. time·pages 는 저장 성공 여부
export const savePendingRead = ({ bookId, jointId, seconds, readPage }) =>
  write({ userId: tokenUserId(), bookId, jointId, seconds, readPage, time: false, pages: false, savedAt: new Date().toISOString() });

// 시간("time") 또는 쪽수("pages") 저장이 끝났다고 표시한다
export const markPendingRead = (part) => {
  const record = read();
  if (record) write({ ...record, [part]: true });
};

export const clearPendingRead = () => write(null);

// 로그인 직후 부른다. 같은 계정의 보관 기록이면 남은 것만 보내고 지운다. 보낸 게 있으면 true
export const flushPendingRead = async () => {
  const record = read();
  write(null);
  if (!record || !record.userId || record.userId !== tokenUserId() || !isFresh(record.savedAt)) return false;
  const jobs = [];
  if (!record.time) jobs.push(addStudyTime(record.bookId, record.seconds));
  if (!record.pages) jobs.push(saveReadPages({ serverBookId: record.bookId, jointId: record.jointId }, record.readPage));
  const results = await Promise.all(jobs);
  return results.some(Boolean);
};
