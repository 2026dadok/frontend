import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { PATHS } from "./routes";
import { startSession } from "./api/session";
import { isLoggedIn } from "./api/client";
import SignupFlow from "./pages/auth/SignupFlow";
import LoginForm from "./pages/auth/LoginForm";
import FindAccount from "./pages/auth/FindAccount";
import Layout from "./components/layouts/layout";
import Home from "./pages/home/Home";
import Quote from "./pages/quote/Quote";
import Library from "./pages/myLibrary/Library";
import SharedLibraryPage from "./pages/sharedLibrary/SharedLibraryPage";
import Review from "./pages/review/Review";
import BookSearch from "./pages/bookSearch/BookSearch";
import WeeklyRank from "./pages/weeklyRank/WeeklyRank";
import MyPage from "./pages/myPage/MyPage";
import EditInfo from "./pages/myPage/EditInfo";
import Timer from "./pages/timer/Timer";
import Landing from "./pages/landing/Landing";
import LegalPage from "./pages/legal/LegalPage";
import { PRIVACY, TERMS } from "./pages/legal/legalDocs";

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
        // 명세서: 로그인 응답은 accessToken, refreshToken, ID
        if (!data?.accessToken) {
          alert("로그인 응답에 토큰이 없습니다.");
          return;
        }
        const { accessToken, refreshToken, ...profile } = data;
        // 토큰은 다른 API 호출이 Authorization 헤더에 쓴다. 내 정보는 화면용 (로그인 응답에는 ID 만 있다)
        // localStorage 가 아니라 이 탭에만 둔다 (api/session.js)
        startSession({ token: accessToken, refreshToken, user: profile });
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

// TODO: 개발 중에는 미사용. 인증을 다시 켤 때 Layout 라우트를 감싸는 데 사용
// eslint-disable-next-line no-unused-vars
const RequireAuth = ({ children }) => {
  const loggedIn = isLoggedIn();
  return loggedIn ? children : <Navigate to={PATHS.login} replace />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={PATHS.guest} replace />} />
      <Route path={PATHS.guest} element={<Landing />} />
      <Route path={PATHS.terms} element={<LegalPage doc={TERMS} />} />
      <Route path={PATHS.privacy} element={<LegalPage doc={PRIVACY} />} />
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route path={PATHS.signup} element={<SignupPage />} />
      <Route path={PATHS.find} element={<FindPage />} />
      {/* TODO: 아래 화면들은 개발 중이라 로그인 없이 열어 둠. 완성 후 RequireAuth 로 감싸기 */}
      {/* 타이머는 사이드바 없이 화면 전체를 쓴다 */}
      <Route path={PATHS.timer} element={<Timer />} />
      {/* Layout 안의 화면은 왼쪽에 사이드바가 붙는다 */}
      <Route element={<Layout />}>
        <Route path={PATHS.main} element={<Home />} />
        <Route path={PATHS.mypage} element={<MyPage />} />
        <Route path={PATHS.mypageEdit} element={<EditInfo />} />
        <Route path={PATHS.rank} element={<WeeklyRank />} />
        <Route path={PATHS.search} element={<BookSearch />} />
        <Route path={PATHS.library} element={<Library />} />
        <Route path={PATHS.review} element={<Review />} />
        <Route path={PATHS.sharedLibrary} element={<SharedLibraryPage />} />
        <Route path={PATHS.quote} element={<Quote />} />
        <Route path={PATHS.settings} element={<div>설정</div>} />
      </Route>
      {/* 없는 주소는 첫 화면으로 */}
      <Route path="*" element={<Navigate to={PATHS.guest} replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;