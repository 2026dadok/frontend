import { useState } from "react";
import SignupForm from "./SignupForm";
import EmailVerify from "./EmailVerify";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";

const SignupFlow = ({ onComplete, onFindAccount }) => {
  const [step, setStep] = useState("signup");
  const [signupData, setSignupData] = useState({});

  const handleSignupNext = (formData) => {
    setSignupData((prev) => ({ ...prev, ...formData }));
    setStep("emailVerify");
  };

  const handleEmailNext = ({ email }) => {
    setSignupData((prev) => ({ ...prev, email }));
    setStep("birth");
  };

  const handleBirthNext = (values) => {
    const birthday = `${values.YYYY}-${values.MM}-${values.DD}`;
    setSignupData((prev) => ({ ...prev, birthday }));
    setStep("goalTime");
  };

  const handleGoalNext = async (values) => {
    const goal_time = `${values.HRS}:${values.MIN}:${values.SEC}`;

    const payload = {
      nickname: signupData.nickname,
      name: signupData.loginId,
      passwd: signupData.password,
      email: signupData.email,
      birthday: signupData.birthday,
      goal_time,
    };

    try {
      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("서버 응답 오류");

      onComplete();
    } catch (err) {
      console.error(err);
      alert("회원가입 중 오류가 발생했습니다.");
      setStep("signup");
    }
  };

  return (
    <>
      {step === "signup" && (
        <SignupForm
          onNext={handleSignupNext}
          onFindAccount={onFindAccount}
        />
      )}

      {step === "emailVerify" && (
        <EmailVerify
          onNext={handleEmailNext}
          onFindAccount={onFindAccount}
        />
      )}

      {step === "birth" && (
        <AuthBirth name={signupData.nickname} onNext={handleBirthNext} />
      )}

      {step === "goalTime" && (
        <AuthGoalTime name={signupData.nickname} onNext={handleGoalNext} />
      )}
    </>
  );
};

export default SignupFlow;