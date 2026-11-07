import { useEffect, useState } from "react";
import { toExpireSeconds } from "../../api/auth";

const VERIFY_TIME = 5 * 60; // 서버가 만료 시간을 안 주면 쓰는 값(초)
const RESEND_COOLDOWN = 60; // 인증번호를 다시 받으려면 기다리는 시간(초)

// 이메일 인증번호 화면의 시계. 회원가입·아이디 찾기·비밀번호 찾기가 같이 쓴다.
//   codeSent: 인증번호를 보냈는지 / secondsLeft: 인증 남은 시간 / resendCooldown: 다시 받기까지 남은 시간
const useEmailTimer = () => {
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_TIME);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!codeSent) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [codeSent]);

  // 인증번호를 보낸 직후에 부른다. expiresIn 은 서버가 알려준 만료 시간
  const startTimer = (expiresIn) => {
    setCodeSent(true);
    setSecondsLeft(toExpireSeconds(expiresIn, VERIFY_TIME));
    setResendCooldown(RESEND_COOLDOWN);
  };

  const timeText = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const sendLabel = resendCooldown > 0 ? `다시 받기 (${resendCooldown}초)` : codeSent ? "다시 받기" : "인증번호 받기";

  return { codeSent, secondsLeft, resendCooldown, timeText, sendLabel, startTimer };
};

export default useEmailTimer;
