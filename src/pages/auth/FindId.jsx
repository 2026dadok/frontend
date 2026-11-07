import { useState } from "react";
import { LineInput } from "./components/LineInput";
import useEmailTimer from "./useEmailTimer";
import { EMAIL_PURPOSE, findId, sendEmailCode, verifyEmailCode } from "../../api/auth";

const FindId = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const { codeSent, secondsLeft, resendCooldown, timeText, sendLabel, startTimer } = useEmailTimer();
  const [foundId, setFoundId] = useState(null);

  const handleStartVerify = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    if (resendCooldown > 0) return;

    // 명세서: POST /auth/email_send (email, purpose) → message, expiresIn
    const { ok, data } = await sendEmailCode(email, EMAIL_PURPOSE.findId);
    if (!ok) {
      alert("인증번호를 보내지 못했습니다. 등록된 이메일인지 확인해주세요.");
      return;
    }

    startTimer(data?.expiresIn);
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
      const verified = await verifyEmailCode(email, code); // 명세서: POST /auth/email_verify
      if (!verified.ok) throw new Error("인증 실패");

      const { ok, data } = await findId(email); // 명세서: POST /auth/find_id (email) → ID
      if (!ok || !data?.ID) throw new Error("조회 실패");

      setFoundId(data.ID);
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
        {codeSent && <span className="ev-timer">{timeText}</span>}
      </div>

      <button
        type="button"
        className="fa-send-link"
        onClick={handleStartVerify}
        disabled={resendCooldown > 0}
      >
        {sendLabel}
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