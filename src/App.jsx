import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { PATHS } from "./routes";
import SignupFlow from "./pages/auth/SignupFlow";    // 1번: 경로 수정
import LoginForm from "./pages/auth/LoginForm";      // 1번
import FindAccount from "./pages/auth/FindAccount";  // 1번
import Layout from "./components/layouts/layout";
import Home from "./pages/home/Home";

const SignupPage = () => {
  const navigate = useNavigate();
  return (
    <SignupFlow
      onComplete={() => navigate(PATHS.login, { replace: true })}
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
      onLoginSuccess={(data) => {
        if (!data?.token) {
          alert("로그인 응답에 토큰이 없습니다.");
          return;
        }    
        localStorage.setItem("token", data.token);
        navigate(PATHS.main, { replace: true });
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
      {/* TODO: 개발 중 임시로 인증 없이 열어둠. 완성 후 RequireAuth로 감싸기 */}
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path={PATHS.mypage} element={<div>마이페이지</div>} />
        <Route path={PATHS.rank} element={<div>주간 경쟁</div>} />
        <Route path={PATHS.search} element={<div>책 검색</div>} />
        <Route path={PATHS.library} element={<div>서고</div>} />
        <Route path={PATHS.sharedLibrary} element={<div>공동 서재</div>} />
        <Route path={PATHS.settings} element={<div>설정</div>} />
      </Route>
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path={PATHS.main} element={<Home />} />
      </Route>
      {/* 5번: 맨 아래에 추가 */}
      <Route path="*" element={<Navigate to={PATHS.guest} replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;