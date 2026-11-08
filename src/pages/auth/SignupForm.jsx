import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import { checkEmailDuplicate } from "../../api/auth";

import "./SignupForm.css";

const SignupForm = ({ onNext, onFindAccount }) => {
  const [nickname, setNickname] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);


  const validate = () => {
    if (!nickname.trim() || !loginId.trim() || !password || !passwordConfirm) {
      alert("모든 항목을 입력하세요.");
      return false;
    }
    if (!isEmailChecked || !isEmailAvailable) {
      alert("아이디(이메일) 중복 확인을 완료해주세요.");
      return false;
    }
    if (nickname.length > 10) {
      alert("닉네임은 10글자 이내로 입력하세요.");
      return false;
    }
    if (loginId.replace(/\s/g, "").length > 21) {
      alert("아이디는 공백 제외 21자 이내로 입력하세요.");
      return false;
    }
    if (password.length > 50) {
      alert("비밀번호는 50자 이내로 입력하세요.");
      return false;
    }
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return false;
    }
    return true;
  };

  const handleCheckDuplicate = async () => {
    if (!loginId.trim()) {
      alert("아이디(이메일)를 입력하세요.");
      return;
    }
    setCheckingEmail(true);
    const { ok, data } = await checkEmailDuplicate(loginId.trim());
    setCheckingEmail(false);
    if (!ok) {
      alert("중복 확인 중 오류가 발생했습니다.");
      return;
    }
    const isDuplicate = data;
    setIsEmailAvailable(!isDuplicate);
    setIsEmailChecked(true);
    alert(isDuplicate ? "이미 사용 중인 아이디입니다." : "사용 가능한 아이디입니다.");
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ nickname: nickname.trim(), loginId: loginId.trim(), password });
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") handleNext();
  };

  return (
    <AuthLayout>
      <div className="signup-form">
        <h1>회원 가입하기</h1>

        <LineInput placeholder="나의 이름" value={nickname} onChange={setNickname} />
        <div className="id-input-wrapper">
          <LineInput
            placeholder="아이디"
            value={loginId}
            onChange={(val) => {
              setLoginId(val);
              setIsEmailChecked(false);
            }}
          />
          <button type="button" className="check-btn" onClick={handleCheckDuplicate} disabled={checkingEmail}>
            {checkingEmail ? "..." : "중복확인"}
          </button>
        </div>
        {isEmailChecked && (
          <span className={`status-msg ${isEmailAvailable ? "available" : "unavailable"}`}>
            {isEmailAvailable ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다."}
          </span>
        )}
        <LineInput
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={setPassword}
        />
        <LineInput
          placeholder="비밀번호 확인"
          type="password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          onKeyDown={handleEnter}
        />

        <div className="signup-footer">
          <button type="button" className="skip-link" onClick={handleNext}>
            넘어가기
          </button>
          <button type="button" className="find-account" onClick={onFindAccount}>
            🔒 아이디 / 비밀번호 찾기
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupForm;