import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const AuthGoalTime = ({ name, onNext }) => {
  const fields = [
    { label: "HRS", options: range(0, 23).map((h) => h.padStart(2, "0")) },
    { label: "MIN", options: range(0, 59).map((m) => m.padStart(2, "0")) },
    { label: "SEC", options: range(0, 59).map((s) => s.padStart(2, "0")) },
  ];

  const validate = (values) => {
    const allSelected = Object.values(values).every((v) => v !== null);
    if (!allSelected) return false;               // 하나라도 안 골랐으면 false

    const allZero = Object.values(values).every((v) => v === "00");
    return !allZero;                               // 00:00:00이면 false
  };

  const handleSubmit = (values) => {
    console.log("목표시간:", values);
    onNext(values);
  };

  return (
    <TripleSelectStep
      title={`${name}님의 하루 독서 목표 시간을 알려주세요`}
      fields={fields}
      buttonLabel="시작"
      onSubmit={handleSubmit}
      validate={validate}
      invalidMessage="목표시간을 입력하세요."
    />
  );
};

export default AuthGoalTime;