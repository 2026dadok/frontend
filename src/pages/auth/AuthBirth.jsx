import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const AuthBirth = ({ name }) => {
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
      onSubmit={() => console.log("다음으로 이동")}
    />
  );
};

export default AuthBirth;