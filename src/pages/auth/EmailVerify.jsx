import { useState, useEffect, useRef } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import "./EmailVerify.css";
import { EMAIL_PURPOSE, sendEmailCode, toExpireSeconds, verifyEmailCode } from "../../api/auth";

const VERIFY_TIME = 5 * 60;
const RESEND_COOLDOWN = 60;

const EmailVerify = ({ onNext, onFindAccount }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_TIME);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendKey, setResendKey] = useState(0);
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

  const handleStartVerify = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    if (resendCooldown > 0) return;

    // 명세서: POST /auth/email_send (email, purpose) → message, expiresIn
    const { ok, data } = await sendEmailCode(email, EMAIL_PURPOSE.signup);
    if (!ok) {
      alert("인증번호를 보내지 못했습니다. 이메일을 확인해주세요.");
      return;
    }

    setCodeSent(true);
    setSecondsLeft(toExpireSeconds(data?.expiresIn, VERIFY_TIME));
    setResendCooldown(RESEND_COOLDOWN);
    setResendKey((prev) => prev + 1);
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
      const { ok } = await verifyEmailCode(email, code, EMAIL_PURPOSE.signup);
      if (!ok) throw new Error("인증 실패");

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
          <button
            type="button"
            className="ev-send-link"
            onClick={handleStartVerify}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `다시 받기 (${resendCooldown}초)`
              : codeSent
              ? "다시 받기"
              : "인증번호 받기"}
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