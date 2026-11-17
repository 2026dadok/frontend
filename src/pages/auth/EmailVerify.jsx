import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import useEmailTimer from "./useEmailTimer";
import "./EmailVerify.css";
import { EMAIL_PURPOSE, sendEmailCode, verifyEmailCode } from "../../api/auth";

const EmailVerify = ({ onNext, onFindAccount }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const { codeSent, secondsLeft, resendCooldown, sending, timeText, sendLabel, sendCode } = useEmailTimer();

  const handleStartVerify = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    await sendCode(() => sendEmailCode(email, EMAIL_PURPOSE.signup), "인증번호를 보내지 못했습니다. 이메일을 확인해주세요.");
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
            disabled={sending || resendCooldown > 0}
          >
            {sendLabel}
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
          {codeSent && <span className="ev-timer">{timeText}</span>}
        </div>

        <div className="ev-find">
          <button type="button" className="find-account" onClick={onFindAccount}>
            🔒 아이디 찾기 / 비밀번호 재설정
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