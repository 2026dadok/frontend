import { useState } from "react";
import SignupForm from "./SignupForm";
import EmailVerify from "./EmailVerify";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";
import LoginForm from "./LoginForm";

const SignupFlow = () => {
  const [step, setStep] = useState("signup");
  const [signupData, setSignupData] = useState(null);

  const handleSignupNext = (formData) => {
    setSignupData(formData);
    setStep("emailVerify");
  };

  const handleEmailNext = async (emailData) => {
    const payload = {
      name: signupData.loginId,
      passwd: signupData.password,
      email: emailData.email,
    };

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
          name={signupData?.displayName}
          onNext={() => setStep("goalTime")}
        />
      )}

      {step === "goalTime" && (
        <AuthGoalTime
          name={signupData?.displayName}
          onNext={(goalTime) => {
            console.log("전체 가입 완료", { ...signupData, goalTime });
            setStep("login");
          }}
        />
      )}

      {step === "login" && (
        <LoginForm
          onGoToSignup={() => setStep("signup")}
          onFindAccount={() => console.log("아이디/비밀번호 찾기")}
        />
      )}
    </>
  );
};

export default SignupFlow;