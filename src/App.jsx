import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { PATHS } from "./routes";
import SignupFlow from "./pages/auth/SignupFlow";    // 1번: 경로 수정
import LoginForm from "./pages/auth/LoginForm";      // 1번
import FindAccount from "./pages/auth/FindAccount";  // 1번

const SignupPage = () => {
  const navigate = useNavigate();
  return (
    <SignupFlow
      onComplete={() => navigate(PATHS.login)}
      onFindAccount={() => navigate(PATHS.find)}
    />
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <LoginForm
      onGoToSignup={() => navigate(PATHS.signup)}
      onFindAccount={() => navigate(PATHS.find)}
      onLoginSuccess={(data) => {                       // 2번: 여기
        localStorage.setItem("token", data.token);      // 응답 필드명은 백엔드 확인 필요
        navigate(PATHS.main);
      }}
    />
  );
};

const FindPage = () => {
  const navigate = useNavigate();
  return (
    <FindAccount
      onBackToLogin={() => navigate(PATHS.login)}
      onGoToSignup={() => navigate(PATHS.signup)}
    />
  );
};

const RequireAuth = ({ children }) => {
  const loggedIn = Boolean(localStorage.getItem("token"));
  return loggedIn ? children : <Navigate to={PATHS.login} replace />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={PATHS.guest} replace />} />
      <Route path={PATHS.guest} element={<div>로그인 전 메인</div>} />
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route path={PATHS.signup} element={<SignupPage />} />
      <Route path={PATHS.find} element={<FindPage />} />
      <Route
        path={PATHS.main}
        element={<RequireAuth><div>로그인 후 메인</div></RequireAuth>}
      />
      {/* 5번: 맨 아래에 추가 */}
      <Route path="*" element={<Navigate to={PATHS.guest} replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;