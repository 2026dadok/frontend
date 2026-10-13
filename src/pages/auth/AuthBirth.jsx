import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const isValidDate = (y, m, d) => {
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return (
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(m) - 1 &&
    date.getDate() === Number(d) &&
    date <= new Date()
  );
};

const AuthBirth = ({ name, onNext }) => {
  const thisYear = new Date().getFullYear();

  const fields = [
    { label: "YYYY", options: range(1926, thisYear).reverse() },
    { label: "MM", options: range(1, 12).map((m) => m.padStart(2, "0")) },
    { label: "DD", options: range(1, 31).map((d) => d.padStart(2, "0")) },
  ];

  return (
    <TripleSelectStep
      title={`${name}님의 생년월일을 알려주세요`}
      fields={fields}
      buttonLabel="다음"
      onSubmit={onNext}
      validate={(values) =>
        Object.values(values).every((v) => v !== null) &&
        isValidDate(values.YYYY, values.MM, values.DD)
      }
      invalidMessage="올바른 생년월일을 입력하세요."
    />
  );
};

export default AuthBirth;