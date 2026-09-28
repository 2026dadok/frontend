import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const AuthBirth = ({ name, onNext }) => {
  const fields = [
    { label: "YYYY", options: range(1926, 2026).reverse() },
    { label: "MM", options: range(1, 12).map((m) => m.padStart(2, "0")) },
    { label: "DD", options: range(1, 31).map((d) => d.padStart(2, "0")) },
  ];

  return (
    <TripleSelectStep
      title={`${name}님의 생년월일을 알려주세요`}
      fields={fields}
      buttonLabel="다음"
      onSubmit={onNext}
      validate={(values) => Object.values(values).every((v) => v !== null)}
      invalidMessage="생년월일을 입력하세요."
    />
  );
};

export default AuthBirth;