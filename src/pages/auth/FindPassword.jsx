import { useState, useEffect, useRef } from "react";
import { LineInput } from "./components/LineInput";

const VERIFY_TIME = 5 * 60;
const RESEND_COOLDOWN = 60;

const FindPassword = ({ onBackToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_TIME);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendKey, setResendKey] = useState(0);
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
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
    if (!name || !email) {
      alert("아이디와 이메일을 입력하세요.");
      return;
    }
    if (resendCooldown > 0) return;

    setCodeSent(true);
    setSecondsLeft(VERIFY_TIME);
    setResendCooldown(RESEND_COOLDOWN);
    setResendKey((prev) => prev + 1);
  };

  const handleVerify = async () => {
    if (secondsLeft === 0) {
      alert("인증 시간이 만료되었습니다.");
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

      setVerified(true);
    } catch (err) {
      console.error(err);
      alert("인증번호가 올바르지 않습니다.");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !newPasswordConfirm) {
      alert("새 비밀번호를 입력하세요.");
      return;
    }
    if (newPassword.length > 50) {
      alert("비밀번호는 50자 이내로 입력하세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const res = await fetch("/auth/find-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, new_passwd: newPassword }),
      });
      if (!res.ok) throw new Error("재설정 실패");

      alert("비밀번호가 변경되었습니다.");
      onBackToLogin();
    } catch (err) {
      console.error(err);
      alert("비밀번호 재설정 중 오류가 발생했습니다.");
    }
  };

  if (verified) {
    return (
      <div className="fa-step">
        <p className="fa-subtitle">비밀번호 재설정</p>
        <LineInput
          placeholder="비밀번호"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <LineInput
          placeholder="비밀번호 확인"
          type="password"
          value={newPasswordConfirm}
          onChange={setNewPasswordConfirm}
        />
        <button type="button" className="fa-submit" onClick={handleResetPassword}>
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="fa-step">
      <LineInput placeholder="아이디" value={name} onChange={setName} />
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
        <button type="button" className="fa-submit" onClick={handleVerify}>
          다음
        </button>
      )}
    </div>
  );
};

export default FindPassword;