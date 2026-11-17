import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import { LineInput } from "./components/LineInput";
import { checkId, PASSWORD_MAX, passwordRuleError } from "../../api/auth";
import "./SignupForm.css";

const SignupForm = ({ onNext, onFindAccount }) => {
  const [nickname, setNickname] = useState(""); // nickname
  const [loginId, setLoginId] = useState("");           // id
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [checking, setChecking] = useState(false); // 아이디 중복 확인 중 (그동안 다시 눌러도 무시한다)

  const validate = () => {
    if (!nickname.trim() || !loginId.trim() || !password || !passwordConfirm) {
      alert("모든 항목을 입력하세요.");
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
    const pwError = passwordRuleError(password);
    if (pwError) {
      alert(pwError);
      return false;
    }
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (checking || !validate()) return;
    // 이미 있는 아이디면 여기서 막는다. 서버가 없으면(data 없음) 일단 넘어가고 가입할 때 서버가 판단한다.
    setChecking(true);
    const { data } = await checkId(loginId.trim());
    setChecking(false);
    if (data?.available === false) {
      alert("이미 사용 중인 아이디입니다.");
      return;
    }
    onNext({ nickname: nickname.trim(), loginId: loginId.trim(), password });
  };

  const handleEnter = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleNext();
  };

  return (
    <AuthLayout>
      <div className="signup-form">
        <h1>회원 가입하기</h1>

        <LineInput placeholder="나의 이름" value={nickname} onChange={setNickname} />
        <LineInput placeholder="아이디" value={loginId} onChange={setLoginId} />
        <LineInput
          placeholder="비밀번호 (8~50자)"
          type="password"
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={setPassword}
        />
        <LineInput
          placeholder="비밀번호 확인"
          type="password"
          maxLength={PASSWORD_MAX}
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          onKeyDown={handleEnter}
        />

        <div className="signup-footer">
          <button type="button" className="skip-link" onClick={handleNext} disabled={checking} aria-busy={checking}>
            {checking ? "확인 중…" : "넘어가기"}
          </button>
          <button type="button" className="find-account" onClick={onFindAccount}>
            🔒 아이디 찾기 / 비밀번호 재설정
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupForm;