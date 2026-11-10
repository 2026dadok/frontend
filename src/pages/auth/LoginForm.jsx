import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import { login } from "../../api/auth";
import "./LoginForm.css";

const LoginForm = ({ onGoToSignup, onFindAccount, onLoginSuccess }) => {
  const [name, setName] = useState(""); //id
  const [passwd, setPasswd] = useState("");

  const validate = () => {
    if (!name || !passwd) {
      alert("아이디와 비밀번호를 입력하세요.");
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
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      const { ok, data } = await login(name, passwd); // 명세서: 요청 ID, passward
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

        <LineInput placeholder="아이디" value={name} onChange={setName} />
        <LineInput
          placeholder="비밀번호"
          type="password"
          value={passwd}
          onChange={setPasswd}
          onKeyDown={handleEnter}
        />

        <div className="login-footer">
          <button type="button" className="signup-link" onClick={onGoToSignup}>
            아직 계정이 없으신가요?
          </button>
          <button type="button" className="find-account" onClick={onFindAccount}>
            🔒 아이디 찾기 / 비밀번호 재설정
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