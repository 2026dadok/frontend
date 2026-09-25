import { useState } from "react";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";

const SignupFlow = () => {
  const [step, setStep] = useState("birth"); // 현재 어느 화면인지 기억
  const name = "지원"; // 지금은 임시값, 나중에 서버/로그인 정보로 교체

  return (
    <>
      {step === "birth" && (
        <AuthBirth
          name={name}
          onNext={() => setStep("goalTime")}
        />
      )}

      {step === "goalTime" && (
        <AuthGoalTime
          name={name}
          onNext={() => console.log("다음 단계로 이동 예정")}
        />
      )}
    </>
  );
};

export default SignupFlow;