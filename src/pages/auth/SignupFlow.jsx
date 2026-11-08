import { useState } from "react";
import SignupForm from "./SignupForm";
import EmailVerify from "./EmailVerify";
import AuthBirth from "./AuthBirth";
import AuthGoalTime from "./AuthGoalTime";
import { signup } from "../../api/auth";

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
    // 목표 시간은 분 단위 정수
    const defaultTimerTime = parseInt(values.HRS) * 60 + parseInt(values.MIN);

    const payload = {
      name: signupData.nickname,
      password: signupData.password, 
      email: signupData.email,
      birthDate: signupData.birthday, 
      defaultTimerTime,
    };

    console.log("회원가입 전송 데이터:", payload); // 추가

    try {
      const { ok } = await signup(payload);
      if (!ok) throw new Error("서버 응답 오류");

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