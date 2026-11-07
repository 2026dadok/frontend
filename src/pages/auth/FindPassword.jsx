import { useState } from "react";
import { LineInput } from "./components/LineInput";
import useEmailTimer from "./useEmailTimer";
import { requestPasswordReset, resetPassword, verifyEmailCode } from "../../api/auth";

// 비밀번호 찾기: 이메일로 인증번호 받기 → 인증번호 확인 → 새 비밀번호 저장
// 명세서: POST /auth/rest-passwrod (email), POST /auth/email_verify (email, code), POST /auth/pw_reset (token, newpassward)
const FindPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState(null); // 인증에 성공하면 채워진다. 값이 있으면 새 비밀번호 화면을 보여준다
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const { codeSent, secondsLeft, resendCooldown, timeText, sendLabel, startTimer } = useEmailTimer();

  const handleStartVerify = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    if (resendCooldown > 0) return;

    const { ok, data } = await requestPasswordReset(email);
    if (!ok) {
      alert("인증번호를 보내지 못했습니다. 등록된 이메일인지 확인해주세요.");
      return;
    }
    startTimer(data?.expiresIn);
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

    const { ok, data } = await verifyEmailCode(email, code);
    if (!ok) {
      alert("인증번호가 올바르지 않습니다.");
      return;
    }
    // TODO: pw_reset 의 token 을 어디서 받는지 명세서에 없다. 응답에 token 이 없으면 인증번호를 그대로 쓴다. 백엔드와 확인
    setToken(data?.token ?? code);
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

    const { ok } = await resetPassword(token, newPassword);
    if (!ok) {
      alert("비밀번호 재설정 중 오류가 발생했습니다.");
      return;
    }
    alert("비밀번호가 변경되었습니다.");
    onBackToLogin();
  };

  if (token) {
    return (
      <div className="fa-step">
        <p className="fa-subtitle">비밀번호 재설정</p>
        <LineInput placeholder="비밀번호" type="password" value={newPassword} onChange={setNewPassword} />
        <LineInput placeholder="비밀번호 확인" type="password" value={newPasswordConfirm} onChange={setNewPasswordConfirm} />
        <button type="button" className="fa-submit" onClick={handleResetPassword}>
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
        {codeSent && <span className="ev-timer">{timeText}</span>}
      </div>

      <button type="button" className="fa-send-link" onClick={handleStartVerify} disabled={resendCooldown > 0}>
        {sendLabel}
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
