// 서고 화면에서 쓰는 데이터. 명세서: GET /bookstore/bookstore_page (서고 페이지)
import { pick, requestServer } from "../../api/client";

// 서버의 날짜별 기록 → { "2026-10-26": 45, ... } (분). 시간은 초 단위로 본다 (명세서의 다른 시간 값과 같다)
// TODO: 서고 페이지 응답의 필드 이름이 명세서에 없다. 백엔드가 정하면 후보 이름을 하나로 줄인다.
const toLog = (d) => {
  const raw = d?.calendar ?? d?.reading_log ?? d?.reading_calendar ?? d?.daily_readtime ?? d?.records;
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .map((r) => [String(pick(r, "date", "read_date", "day") ?? "").slice(0, 10), Number(pick(r, "readtime", "read_time", "today_readtime", "seconds")) || 0])
        .filter(([date]) => date)
        .map(([date, sec]) => [date, Math.round(sec / 60)])
    );
  }
  if (raw && typeof raw === "object") {
    return Object.fromEntries(Object.entries(raw).map(([date, sec]) => [date, Math.round((Number(sec) || 0) / 60)]));
  }
  return null;
};

// 날짜별 읽은 시간(분). 서버가 없거나 실패하면 빈 달력
export const fetchReadingLog = async () => {
  const { ok, data } = await requestServer("GET", "/bookstore/bookstore_page");
  return (ok ? toLog(data?.data ?? data) : null) ?? {};
};
