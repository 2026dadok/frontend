import { useState } from "react";
import { LineInput } from "./components/LineInput";
import useEmailTimer from "./useEmailTimer";
import { EMAIL_PURPOSE, PASSWORD_MAX, passwordRuleError, resetPassword, sendEmailCode, verifyEmailCode } from "../../api/auth";

// 비밀번호 재설정: 이메일로 인증번호 받기 → 인증번호 확인 → 새 비밀번호 저장
// 원래 비밀번호는 서버도 모르고(암호화 저장) 화면에 보여주지도 않는다. 본인 확인 후 새 비밀번호로 바꾸기만 한다.
// 백엔드: POST /auth/email_send (email, purpose=find_pw) → POST /auth/email_verify (email, code, purpose=find_pw)
//        → POST /auth/pw_reset (email, code, newPassword). 이메일·인증번호는 화면에 들고 있다가 마지막에 같이 보낸다.
const ResetPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false); // 인증에 성공하면 true. 새 비밀번호 화면을 보여준다
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const { codeSent, secondsLeft, resendCooldown, timeText, sendLabel, startTimer } = useEmailTimer();

  const handleStartVerify = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    if (resendCooldown > 0) return;

    const { ok, data } = await sendEmailCode(email, EMAIL_PURPOSE.findPw);
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

    const { ok } = await verifyEmailCode(email, code, EMAIL_PURPOSE.findPw);
    if (!ok) {
      alert("인증번호가 올바르지 않습니다.");
      return;
    }
    setVerified(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || !newPasswordConfirm) {
      alert("새 비밀번호를 입력하세요.");
      return;
    }
    const pwError = passwordRuleError(newPassword);
    if (pwError) {
      alert(pwError);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const { ok } = await resetPassword(email, code, newPassword);
    if (!ok) {
      alert("비밀번호 재설정 중 오류가 발생했습니다.");
      return;
    }
    alert("비밀번호가 변경되었습니다.");
    onBackToLogin();
  };

  if (verified) {
    return (
      <div className="fa-step">
        <p className="fa-subtitle">비밀번호 재설정</p>
        <LineInput placeholder="비밀번호 (8~50자)" type="password" maxLength={PASSWORD_MAX} value={newPassword} onChange={setNewPassword} />
        <LineInput placeholder="비밀번호 확인" type="password" maxLength={PASSWORD_MAX} value={newPasswordConfirm} onChange={setNewPasswordConfirm} />
        <button type="button" className="fa-submit" onClick={handleResetPassword}>
          비밀번호 변경
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

export default ResetPassword;
