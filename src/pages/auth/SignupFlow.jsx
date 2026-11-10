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
    const goal_time = `${values.HRS}:${values.MIN}`; // 시:분 (초는 받지 않는다)

    // 명세서: name, ID, passward. 회원 테이블에는 닉네임이 없고 이름(user_name)과 아이디(user_id)만 있다.
    // 이름 칸에는 화면의 "닉네임" 입력을 보낸다. TODO: 이메일·생일·목표 시간의 키 이름과 목표 시간 단위는 백엔드와 확인
    const payload = {
      name: signupData.nickname,
      ID: signupData.loginId,
      password: signupData.password,
      email: signupData.email,
      birthdate: signupData.birthday,
      goal_time,
    };

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