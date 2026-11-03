// 목표 독서시간(시·분) 입력에서 쓰는 값. 회원정보 수정과 타이머가 같이 쓴다.

export const TIME_PARTS = [
  { label: "시간", max: 23 },
  { label: "분", max: 59 },
];

// "0:5" 처럼 입력 중인 값을 "00:05" 로 맞춘다. 목표 시간은 시·분만 받는다 (HH:MM)
// 서버가 예전 형식("00:30:00")으로 줘도 앞의 시·분만 쓴다
export const normalizeGoalTime = (value) =>
  TIME_PARTS.map((_, i) => (value.split(":")[i] ?? "").padStart(2, "0")).join(":");
