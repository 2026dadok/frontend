import { useState, useEffect, useRef } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import "./EmailVerify.css";

const VERIFY_TIME = 5 * 60;

const EmailVerify = ({ onNext, onFindAccount }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_TIME);
  const timerRef = useRef(null);

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
  }, [codeSent]);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSendCode = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }

    try {
      // TODO: 인증번호 발송 엔드포인트 명세서에 없음, 서버팀 확인 필요
      const res = await fetch("/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("발송 실패");

      setCodeSent(true);
      setSecondsLeft(VERIFY_TIME);
    } catch (err) {
      console.error(err);
      alert("인증번호 발송 중 오류가 발생했습니다.");
    }
  };

  const handleCreateAccount = async () => {
    if (!codeSent) {
      alert("이메일 인증을 진행해주세요.");
      return;
    }
    if (secondsLeft === 0) {
      alert("인증 시간이 만료되었습니다. 다시 시도해주세요.");
      return;
    }
    if (!code || code.length !== 6) {
      alert("인증번호 6자리를 입력하세요.");
      return;
    }

    try {
      const res = await fetch("/auth/email-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) throw new Error("인증 실패");

      onNext({ email });
    } catch (err) {
      console.error(err);
      alert("인증번호가 올바르지 않습니다.");
    }
  };

  return (
    <AuthLayout>
      <div className="email-verify">
        <h1>이메일 인증</h1>

        <div className="ev-label-row">
          <span className="ev-input-label">이메일</span>
          <button type="button" className="ev-send-link" onClick={handleSendCode}>
            인증번호 받기
          </button>
        </div>
        <LineInput
          placeholder="이메일"
          type="email"
          value={email}
          onChange={setEmail}
        />

        <div className="ev-code-row">
          <LineInput
            placeholder="인증번호 6자리 입력"
            value={code}
            onChange={setCode}
          />
          {codeSent && <span className="ev-timer">{formatTime(secondsLeft)}</span>}
        </div>

        <div className="ev-find">
          <button type="button" className="find-account" onClick={onFindAccount}>
            🔒 아이디 / 비밀번호 찾기
          </button>
        </div>

        <button type="button" className="ev-submit" onClick={handleCreateAccount}>
          계정 생성
        </button>
      </div>
    </AuthLayout>
  );
};

export default EmailVerify;