import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import { login } from "../../api/auth";
import "./LoginForm.css";

const LoginForm = ({ onGoToSignup, onFindAccount, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const validate = () => {
    if (!email || !password) {
      alert("아이디와 비밀번호를 입력하세요.");
      return false;
    }
    if (email.replace(/\s/g, "").length > 21) {
      alert("아이디는 공백 제외 21자 이내로 입력하세요.");
      return false;
    }
    if (password.length > 50) {
      alert("비밀번호는 50자 이내로 입력하세요.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    // 추가: 전송 데이터 확인
    console.log("로그인 시도 데이터:", { email, password });

    try {
      const { ok, data } = await login(email, password);
      if (!ok) throw new Error("로그인 실패");
      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <AuthLayout>
      <div className="login-form">
        <h1>로그인하기</h1>

        <LineInput placeholder="이메일" value={email} onChange={setEmail} />
        <LineInput
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={setPassword}
          onKeyDown={handleEnter}
        />

        <div className="login-footer">
          <button type="button" className="signup-link" onClick={onGoToSignup}>
            아직 계정이 없으신가요?
          </button>
          <button type="button" className="find-account" onClick={onFindAccount}>
            🔒 아이디 / 비밀번호 찾기
          </button>
        </div>

        <button type="button" className="login-submit" onClick={handleLogin}>
          로그인
        </button>
      </div>
    </AuthLayout>
  );
};

export default LoginForm;