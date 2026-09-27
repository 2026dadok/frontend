import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import "./SignupForm.css";

const SignupForm = ({ onNext, onFindAccount }) => {
  const [displayName, setDisplayName] = useState(""); // nickname
  const [loginId, setLoginId] = useState("");           // id
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const validate = () => {
    if (!displayName || !loginId || !password || !passwordConfirm) {
      alert("모든 항목을 입력하세요.");
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

  const handleNext = () => {
    if (!validate()) return;
    onNext({ displayName, loginId, password });
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") handleNext();
  };

  return (
    <AuthLayout>
      <div className="signup-form">
        <h1>회원 가입하기</h1>

        <LineInput placeholder="나의 이름" value={displayName} onChange={setDisplayName} />
        <LineInput placeholder="아이디" value={loginId} onChange={setLoginId} />
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