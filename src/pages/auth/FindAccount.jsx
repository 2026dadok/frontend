import { useState } from "react";
import AuthLayout from "./components/AuthLayout";
import FindId from "./FindId";
import FindPassword from "./FindPassword";
import "./FindAccount.css";

const FindAccount = ({ onBackToLogin, onGoToSignup }) => {
  const [tab, setTab] = useState("id"); // "id" | "password"

  return (
    <AuthLayout>
      <div className="find-account-page">
        <h1>아이디 / 비밀번호 찾기</h1>

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
            비밀번호 찾기
          </button>
        </div>

        {tab === "id" ? (
          <FindId onBackToLogin={onBackToLogin} />
        ) : (
          <FindPassword onBackToLogin={onBackToLogin} />
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