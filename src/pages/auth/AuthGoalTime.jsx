import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const AuthGoalTime = ({ name, onNext }) => {
  const fields = [
    { label: "HRS", options: range(0, 23).map((h) => h.padStart(2, "0")) },
    { label: "MIN", options: range(0, 59).map((m) => m.padStart(2, "0")) },
  ]; // 목표 시간은 시·분만 받는다 (초 없음)

  const validate = (values) => {
    const allSelected = Object.values(values).every((v) => v !== null);
    if (!allSelected) return false;

    const allZero = Object.values(values).every((v) => v === "00");
    return !allZero;
  };

  return (
    <TripleSelectStep
      title={`${name}님의 하루 독서 목표 시간을 알려주세요`}
      fields={fields}
      buttonLabel="시작"
      onSubmit={onNext}
      validate={validate}
      invalidMessage="목표시간을 입력하세요."
    />
  );
};

export default AuthGoalTime;