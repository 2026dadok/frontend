import { useState, useEffect, useRef } from "react";
import { LineInput } from "./components/LineInput";

const VERIFY_TIME = 5 * 60;
const RESEND_COOLDOWN = 60;

const FindId = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_TIME);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendKey, setResendKey] = useState(0);
  const [foundId, setFoundId] = useState(null);
  const timerRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    if (!codeSent) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [codeSent, resendKey]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [resendKey, resendCooldown]);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStartVerify = () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    if (resendCooldown > 0) return;

    setCodeSent(true);
    setSecondsLeft(VERIFY_TIME);
    setResendCooldown(RESEND_COOLDOWN);
    setResendKey((prev) => prev + 1);
  };

  const handleFindId = async () => {
    if (!codeSent) {
      alert("이메일 인증을 진행해주세요.");
      return;
    }
    if (secondsLeft === 0) {
      alert("인증 시간이 만료되었습니다.");
      return;
    }
    if (!code || code.length !== 6) {
      alert("인증번호 6자리를 입력하세요.");
      return;
    }

    try {
      const verifyRes = await fetch("/auth/email-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!verifyRes.ok) throw new Error("인증 실패");

      const res = await fetch("/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("조회 실패");

      const data = await res.json();
      setFoundId(data.name);
    } catch (err) {
      console.error(err);
      alert("아이디 조회 중 오류가 발생했습니다.");
    }
  };

  if (foundId) {
    return (
      <div className="fa-result">
        <p>회원님의 아이디는 아래와 같습니다</p>
        <p className="fa-result-id">@{foundId}</p>
        <button type="button" className="fa-submit" onClick={onBackToLogin}>
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="fa-step">
      <LineInput placeholder="이메일" type="email" value={email} onChange={setEmail} />

      <div className="ev-code-row">
        <LineInput placeholder="인증번호 6자리 입력" value={code} onChange={setCode} />
        {codeSent && <span className="ev-timer">{formatTime(secondsLeft)}</span>}
      </div>

      <button
        type="button"
        className="fa-send-link"
        onClick={handleStartVerify}
        disabled={resendCooldown > 0}
      >
        {resendCooldown > 0
          ? `다시 받기 (${resendCooldown}초)`
          : codeSent
          ? "다시 받기"
          : "인증번호 받기"}
      </button>

      {codeSent && (
        <button type="button" className="fa-submit" onClick={handleFindId}>
          넘어가기
        </button>
      )}
    </div>
  );
};

export default FindId;