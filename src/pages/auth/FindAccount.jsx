import { useSearchParams } from "react-router-dom";
import AuthLayout from "./components/AuthLayout";
import FindId from "./FindId";
import ResetPassword from "./ResetPassword";
import "./FindAccount.css";

const FindAccount = ({ onBackToLogin, onGoToSignup, onBack }) => {
  // 고른 탭은 주소(?pageGubun=password)에 둔다. 새로고침해도 보던 탭이 그대로 열린다.
  // replace: 탭을 바꿀 때마다 방문 기록을 쌓지 않는다 (뒤로 가기는 바로 로그인 화면으로)
  const [params, setParams] = useSearchParams();
  const tab = params.get("pageGubun") === "password" ? "password" : "id";
  const setTab = (next) => setParams(next === "password" ? { pageGubun: "password" } : {}, { replace: true });

  return (
    <AuthLayout onBack={onBack}>
      <div className="find-account-page">
        <h1>아이디 찾기 / 비밀번호 재설정</h1>

        <div className="fa-tabs">
          <button
            type="button"
            className={`fa-tab ${tab === "id" ? "active" : ""}`}
            onClick={() => setTab("id")}
          >
            아이디 찾기
          </button>
          <button
            type="button"
            className={`fa-tab ${tab === "password" ? "active" : ""}`}
            onClick={() => setTab("password")}
          >
            비밀번호 재설정
          </button>
        </div>

        {tab === "id" ? (
          <FindId onBackToLogin={onBackToLogin} />
        ) : (
          <ResetPassword onBackToLogin={onBackToLogin} />
        )}

        <div className="fa-find">
          <button type="button" className="signup-link" onClick={onGoToSignup}>
            아직 계정이 없으신가요?
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default FindAccount;