export const TIME_PARTS = [
  { label: "시간", max: 23 },
  { label: "분", max: 59 },
];

export const normalizeGoalTime = (value) =>
  TIME_PARTS.map((_, i) => (value.split(":")[i] ?? "").padStart(2, "0")).join(":");
