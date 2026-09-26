import { useState } from "react";
import SignupForm from "./SignupForm";
import EmailVerify from "./EmailVerify";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";

const SignupFlow = () => {
  const [step, setStep] = useState("signup");
  const [signupData, setSignupData] = useState(null);

  const handleSignupNext = (formData) => {
    setSignupData(formData);
    setStep("emailVerify");
  };

  const handleEmailNext = async (emailData) => {
    const payload = { ...signupData, ...emailData };

    try {
      const res = await fetch("/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("서버 응답 오류");

      setStep("birth");
    } catch (err) {
      console.error(err);
      alert("계정 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      {step === "signup" && (
        <SignupForm
          onNext={handleSignupNext}
          onFindAccount={() => console.log("아이디/비밀번호 찾기")}
        />
      )}

      {step === "emailVerify" && (
        <EmailVerify
          onNext={handleEmailNext}
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
          onNext={(goalTime) => {
            console.log("전체 가입 완료", { ...signupData, goalTime });
          }}
        />
      )}
    </>
  );
};

export default SignupFlow;