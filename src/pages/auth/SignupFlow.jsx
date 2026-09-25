import { useState } from "react";
import SignupForm from "./SignupForm";
import EmailVerify from "./EmailVerify";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";

const SignupFlow = () => {
  const [step, setStep] = useState("signup"); // signup → emailVerify → birth → goalTime
  const [signupData, setSignupData] = useState(null);

  // 1단계: 회원가입 폼 제출
  const handleSignupSubmit = (formData) => {
    setSignupData(formData);
    setStep("emailVerify");
  };

  // 2단계: 이메일 인증 제출 → 서버로 전송
  const handleEmailSubmit = async (emailData) => {
    const payload = { ...signupData, ...emailData };

    try {
      const res = await fetch("/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("서버 응답 오류");

      setStep("birth"); // 가입 성공 시 생년월일 입력으로 이동
    } catch (err) {
      console.error(err);
      alert("계정 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      {step === "signup" && (
        <SignupForm
          onSubmit={handleSignupSubmit}
          onSkip={() => setStep("emailVerify")}
          onFindAccount={() => console.log("아이디/비밀번호 찾기")}
        />
      )}

      {step === "emailVerify" && (
        <EmailVerify
          onSubmit={handleEmailSubmit}
          onFindAccount={() => console.log("아이디/비밀번호 찾기")}
        />
      )}

      {step === "birth" && (
        <AuthBirth
          name={signupData?.name}
          onNext={() => setStep("goalTime")}
        />
      )}

      {step === "goalTime" && (
        <AuthGoalTime
          name={signupData?.name}
          onNext={(goalTime) => console.log("전체 가입 완료", goalTime)}
        />
      )}
    </>
  );
};

export default SignupFlow;