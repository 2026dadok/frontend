// 서고 화면에서 쓰는 데이터: GET /bookstore/bookstore_page → { calendar: [{ date: "yyyy-MM-dd", seconds }] }
import { requestServer } from "../../api/client";

// 날짜별 읽은 시간(분) { "2026-10-26": 45, ... }. 서버가 없거나 실패하면 빈 달력
export const fetchReadingLog = async () => {
  const { ok, data } = await requestServer("GET", "/bookstore/bookstore_page");
  const rows = ok && Array.isArray(data?.calendar) ? data.calendar : [];
  return Object.fromEntries(rows.filter((r) => r.date).map((r) => [String(r.date).slice(0, 10), Math.round((Number(r.seconds) || 0) / 60)]));
};
