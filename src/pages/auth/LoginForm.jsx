import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import "./LoginForm.css";

const LoginForm = ({ onGoToSignup, onFindAccount }) => {
  const [name, setName] = useState("");       // 아이디 역할
  const [passwd, setPasswd] = useState("");
  const [email, setEmail] = useState("");

  const validate = () => {
    if (!name || !passwd || !email) {
      alert("모든 항목을 입력하세요.");
      return false;
    }
    if (name.replace(/\s/g, "").length > 21) {
      alert("아이디는 공백 제외 21자 이내로 입력하세요.");
      return false;
    }
    if (passwd.length > 50) {
      alert("비밀번호는 50자 이내로 입력하세요.");
      return false;
    }
    if (email.length > 30) {
      alert("이메일은 30자 이내로 입력하세요.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      const res = await fetch("/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, passwd, email }),
      });

      if (!res.ok) throw new Error("로그인 실패");

      const data = await res.json();
      console.log("로그인 성공:", data);
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

        <LineInput placeholder="아이디" value={name} onChange={setName} />
        <LineInput
          placeholder="비밀번호"
          type="password"
          value={passwd}
          onChange={setPasswd}
        />
        <LineInput
          placeholder="이메일"
          type="email"
          value={email}
          onChange={setEmail}
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