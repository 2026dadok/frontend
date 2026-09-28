import { useState } from "react";
import SignupForm from "./SignupForm";
import EmailVerify from "./EmailVerify";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";
import LoginForm from "./LoginForm";
import FindAccount from "./FindAccount";

const SignupFlow = () => {
  const [step, setStep] = useState("signup");
  const [signupData, setSignupData] = useState({});

  // 1단계: 이름/아이디/비밀번호
  const handleSignupNext = (formData) => {
    setSignupData((prev) => ({ ...prev, ...formData }));
    setStep("emailVerify");
  };

  // 2단계: 이메일 (서버 전송 X, 값만 보관)
  const handleEmailNext = ({ email }) => {
    setSignupData((prev) => ({ ...prev, email }));
    setStep("birth");
  };

  // 3단계: 생년월일 (서버 전송 X)
  const handleBirthNext = (values) => {
    const birthday = `${values.YYYY}-${values.MM}-${values.DD}`;
    setSignupData((prev) => ({ ...prev, birthday }));
    setStep("goalTime");
  };

  // 4단계: 목표시간 → 여기서 한 번에 회원가입 요청
  const handleGoalNext = async (values) => {
    const goal_time = `${values.HRS}:${values.MIN}:${values.SEC}`;

    const payload = {
      name: signupData.loginId,
      passwd: signupData.password,
      email: signupData.email,
      birthday: signupData.birthday,
      goal_time,
    };

    try {
      const res = await fetch("/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("서버 응답 오류");

      setStep("login");
    } catch (err) {
      console.error(err);
      alert("회원가입 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      {step === "signup" && (
        <SignupForm
          onNext={handleSignupNext}
          onFindAccount={() => setStep("findAccount")}
        />
      )}

      {step === "emailVerify" && (
        <EmailVerify
          onNext={handleEmailNext}
          onFindAccount={() => setStep("findAccount")}
        />
      )}

      {step === "birth" && (
        <AuthBirth name={signupData.displayName} onNext={handleBirthNext} />
      )}

      {step === "goalTime" && (
        <AuthGoalTime name={signupData.displayName} onNext={handleGoalNext} />
      )}

      {step === "login" && (
        <LoginForm
          onGoToSignup={() => setStep("signup")}
          onFindAccount={() => setStep("findAccount")}
        />
      )}

      {step === "findAccount" && (
        <FindAccount
          onBackToLogin={() => setStep("login")}
          onGoToSignup={() => setStep("signup")}
        />
      )}
    </>
  );
};

export default SignupFlow;