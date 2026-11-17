import { useState } from "react";
import { LineInput } from "./components/LineInput";
import useEmailTimer from "./useEmailTimer";
import { EMAIL_PURPOSE, FIND_ID_FIELDS, findId, sendEmailCode, verifyEmailCode } from "../../api/auth";

const FindId = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  // 이메일 말고 더 받는 값(이름·생년월일). 어떤 칸이 있는지는 api/auth.js 의 FIND_ID_FIELDS 가 정한다.
  const [extra, setExtra] = useState(() => Object.fromEntries(FIND_ID_FIELDS.map((f) => [f.key, ""])));
  const [code, setCode] = useState("");
  const { codeSent, secondsLeft, resendCooldown, sending, timeText, sendLabel, sendCode } = useEmailTimer();
  const [foundId, setFoundId] = useState(null);

  const handleStartVerify = async () => {
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    await sendCode(() => sendEmailCode(email, EMAIL_PURPOSE.findId), "인증번호를 보내지 못했습니다. 등록된 이메일인지 확인해주세요.");
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
    const missing = FIND_ID_FIELDS.find((f) => !extra[f.key].trim());
    if (missing) {
      alert(`${missing.placeholder}을(를) 입력하세요.`);
      return;
    }

    const verified = await verifyEmailCode(email, code, EMAIL_PURPOSE.findId); // POST /auth/email_verify (purpose 필수)
    if (!verified.ok) {
      alert("인증번호가 올바르지 않습니다.");
      return;
    }
    const trimmed = Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v.trim()]));
    const { ok, id } = await findId({ ...trimmed, email }); // POST /auth/find_id
    if (!ok) {
      alert("일치하는 회원 정보를 찾지 못했습니다. 입력한 정보를 확인해주세요.");
      return;
    }
    setFoundId(id);
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
      {FIND_ID_FIELDS.map((f) => (
        <LineInput
          key={f.key}
          placeholder={f.placeholder}
          type={f.type}
          value={extra[f.key]}
          onChange={(v) => setExtra((prev) => ({ ...prev, [f.key]: v }))}
        />
      ))}
      <LineInput placeholder="이메일" type="email" value={email} onChange={setEmail} />

      <div className="ev-code-row">
        <LineInput placeholder="인증번호 6자리 입력" value={code} onChange={setCode} />
        {codeSent && <span className="ev-timer">{timeText}</span>}
      </div>

      <button
        type="button"
        className="fa-send-link"
        onClick={handleStartVerify}
        disabled={sending || resendCooldown > 0}
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