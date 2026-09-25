import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import "./SignupForm.css";

const SignupForm = ({ onSubmit, onSkip, onFindAccount }) => {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSubmit = () => {
    if (!name || !id || !password || !passwordConfirm) {
      alert("모든 항목을 입력하세요.");
      return;
    }
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    onSubmit({ name, id, password });
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <AuthLayout>
      <div className="signup-form">
        <h1>회원 가입하기</h1>

        <LineInput placeholder="나의 이름" value={name} onChange={setName} />
        <LineInput placeholder="아이디" value={id} onChange={setId} />
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
          <button type="button" className="skip-link" onClick={onSkip}>
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