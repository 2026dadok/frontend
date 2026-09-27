import { useState, useEffect, useRef } from "react";
import { LineInput } from "./components/LineInput";

const VERIFY_TIME = 5 * 60;

const FindPassword = ({ onBackToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_TIME);
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
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

  const handleSendCode = () => {
    if (!name || !email) {
      alert("아이디와 이메일을 입력하세요.");
      return;
    }
    // TODO: /auth/send-code 연동
    setCodeSent(true);
    setSecondsLeft(VERIFY_TIME);
  };

  const handleVerify = () => {
    if (secondsLeft === 0) {
      alert("인증 시간이 만료되었습니다.");
      return;
    }
    if (!code || code.length !== 6) {
      alert("인증번호 6자리를 입력하세요.");
      return;
    }
    // TODO: /auth/find-password 연동 (본인 확인)
    setVerified(true);
  };

  const handleResetPassword = () => {
    if (!newPassword || !newPasswordConfirm) {
      alert("새 비밀번호를 입력하세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    // TODO: 비밀번호 재설정 API 연동 (엔드포인트 확정 후 추가)
    alert("비밀번호가 변경되었습니다.");
    onBackToLogin();
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

      {!codeSent ? (
        <button type="button" className="fa-send-link" onClick={handleSendCode}>
          인증번호 받기
        </button>
      ) : (
        <button type="button" className="fa-submit" onClick={handleVerify}>
          다음
        </button>
      )}
    </div>
  );
};

export default FindPassword;