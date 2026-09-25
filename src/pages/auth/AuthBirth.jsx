import TripleSelectStep from "./components/TripleSelectStep";
import { range } from "./range";

const AuthBirth = ({ name, onNext }) => {
  const fields = [
    { label: "YYYY", options: range(1926, 2026).reverse() },
    { label: "MM", options: range(1, 12).map((m) => m.padStart(2, "0")) },
    { label: "DD", options: range(1, 31).map((d) => d.padStart(2, "0")) },
  ];

  const handleSubmit = async (values) => {
    const birthDate = `${values.YYYY}-${values.MM}-${values.DD}`;

    try {
      const res = await fetch("/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate }),
      });

      if (!res.ok) throw new Error("서버 응답 오류");

      onNext();
    } catch (err) {
      console.error(err);
      alert("생년월일 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <TripleSelectStep
      title={`${name}님의 생년월일을 알려주세요`}
      fields={fields}
      buttonLabel="다음"
      onSubmit={handleSubmit}
      validate={(values) => Object.values(values).every((v) => v !== null)}
      invalidMessage="생년월일을 입력하세요."
    />
  );
};

export default AuthBirth;