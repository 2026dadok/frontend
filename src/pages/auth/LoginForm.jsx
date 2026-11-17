import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import { login } from "../../api/auth";
import "./LoginForm.css";

const LoginForm = ({ onGoToSignup, onFindAccount, onLoginSuccess }) => {
  const [name, setName] = useState(""); //id
  const [passwd, setPasswd] = useState("");
  // 로그인이 만료돼서 넘어왔으면(api/client.js 가 ?expired=1 을 붙인다) 안내를 띄운다
  const expired = new URLSearchParams(window.location.search).get("expired") === "1";

  const validate = () => {
    if (!name.trim() || !passwd) {
      alert("아이디와 비밀번호를 입력하세요.");
      return false;
    }
    if (name.trim().length > 21) {
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
      const id = name.trim(); // 앞뒤 공백은 빼고 보낸다 (저장하는 아이디와 같게)
      const { ok, status, data } = await login(id, passwd);
      if (status === 0 || status >= 500) {
        alert("서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (!ok) throw new Error("로그인 실패");
      // 백엔드 로그인 응답에는 토큰만 있고 아이디가 없다. 입력한 아이디를 같이 넘겨서 "나"를 구분하는 데 쓴다.
      onLoginSuccess({ ID: id, ...data });
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
        {expired && <p className="login-expired">로그인이 만료됐어요. 다시 로그인해주세요.</p>}

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