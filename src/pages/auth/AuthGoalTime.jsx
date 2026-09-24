import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const AuthGoalTime = ({ name }) => {
  const fields = [
    { label: "HRS", options: range(0, 23).map((h) => h.padStart(2, "0")) },
    { label: "MIN", options: range(0, 59).map((m) => m.padStart(2, "0")) },
    { label: "SEC", options: range(0, 59).map((s) => s.padStart(2, "0")) },
  ];

  return (
    <TripleSelectStep
      title={`${name}님의 하루 독서 목표 시간을 알려주세요`}
      fields={fields}
      buttonLabel="시작"
      onSubmit={() => console.log("시작하기")}
    />
  );
};

export default AuthGoalTime;