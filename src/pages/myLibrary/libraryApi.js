// 서고 화면에서 쓰는 데이터. 아직 백엔드가 없는 항목은 TODO.

// 날짜별 읽은 시간(분): { "2026-10-26": 45, ... }
// TODO: 백엔드에서 날짜별 독서 시간을 받아오는 API가 정해지면 교체 (지금은 브라우저에 저장된 값, 없으면 빈 값)
export const fetchReadingLog = () => {
  try {
    const log = JSON.parse(localStorage.getItem("readingLog"));
    return log && typeof log === "object" ? log : {};
  } catch {
    return {};
  }
};
