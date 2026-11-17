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

    // 회원 테이블에는 닉네임이 없고 이름(name)과 아이디만 있다. 이름 칸에는 화면의 "닉네임" 입력을 보낸다.
    // 백엔드 SignUpRequest 가 버전마다 키 이름이 달라서 두 가지 모양을 같이 보낸다 (모르는 키는 백엔드가 무시한다).
    //   test 브랜치: ID, birthdate, goal_time("HH:mm")
    //   다른 버전:   userId, birthDate, defaultTimerTime(초)
    const payload = {
      name: signupData.nickname,
      ID: signupData.loginId,
      userId: signupData.loginId,
      password: signupData.password,
      email: signupData.email,
      birthdate: signupData.birthday,
      birthDate: signupData.birthday,
      goal_time,
      defaultTimerTime: Number(values.HRS) * 3600 + Number(values.MIN) * 60,
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