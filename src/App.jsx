import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { PATHS } from "./routes";
import { startSession } from "./api/session";
import { flushPendingRead } from "./pages/timer/pendingRead";
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
import AiReview from "./pages/review/AiReview";
import BookSearch from "./pages/bookSearch/BookSearch";
import WeeklyRank from "./pages/weeklyRank/WeeklyRank";
import MyPage from "./pages/myPage/MyPage";
import EditInfo from "./pages/myPage/EditInfo";
import Timer from "./pages/timer/Timer";
import Landing from "./pages/landing/Landing";
import LegalPage from "./pages/legal/LegalPage";
import { PRIVACY, TERMS } from "./pages/legal/legalDocs";

// 뒤로 가기: 앞 화면이 있으면 그리로, 주소로 바로 들어와 앞 화면이 없으면 로그인으로
const useGoBack = () => {
  const navigate = useNavigate();
  return () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(PATHS.login));
};

const SignupPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  return (
    <SignupFlow
      onComplete={() => navigate(PATHS.login, { replace: true })}
      onFindAccount={() => navigate(PATHS.find)}
      onBack={goBack}
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
        // 백엔드 로그인 응답은 accessToken, refreshToken. ID 는 LoginForm 이 입력값으로 채워 넘긴다
        if (!data?.accessToken) {
          alert("로그인 응답에 토큰이 없습니다.");
          return;
        }
        // 토큰은 다른 API 호출이 Authorization 헤더에 쓴다. 내 정보는 화면용 (로그인 응답에는 ID 만 있다)
        // localStorage 가 아니라 이 탭에만 둔다 (api/session.js). refresh 토큰은 httpOnly 쿠키로만 쓴다
        const profile = { ...data };
        delete profile.accessToken;
        delete profile.refreshToken;
        startSession({ token: data.accessToken, user: profile });
        // 로그인 만료로 저장하지 못한 독서 기록이 있으면 보낸다
        flushPendingRead().then((sent) => {
          if (sent) alert("로그인 전에 저장하지 못한 독서 기록을 저장했어요.");
        });
        navigate(PATHS.main, { replace: true });
      }}
    />
  );
};

const FindPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  return (
    <FindAccount
      onBackToLogin={() => navigate(PATHS.login)}
      onGoToSignup={() => navigate(PATHS.signup)}
      onBack={goBack}
    />
  );
};

// 로그인하지 않은 사람만 보는 화면 (로그인 화면)
const GuestOnly = ({ children }) => (isLoggedIn() ? <Navigate to={PATHS.main} replace /> : children);

// 로그인해야 들어갈 수 있는 화면을 감싼다
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
      {/* 이미 로그인했으면 홈으로 (다른 계정으로 바꾸려면 로그아웃부터) */}
      <Route path={PATHS.login} element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path={PATHS.signup} element={<SignupPage />} />
      <Route path={PATHS.find} element={<FindPage />} />
      {/* 타이머는 사이드바 없이 화면 전체를 쓴다 */}
      <Route path={PATHS.timer} element={<RequireAuth><Timer /></RequireAuth>} />
      {/* Layout 안의 화면은 왼쪽에 사이드바가 붙는다 */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path={PATHS.main} element={<Home />} />
        <Route path={PATHS.mypage} element={<MyPage />} />
        <Route path={PATHS.mypageEdit} element={<EditInfo />} />
        <Route path={PATHS.rank} element={<WeeklyRank />} />
        <Route path={PATHS.search} element={<BookSearch />} />
        <Route path={PATHS.library} element={<Library />} />
        <Route path={PATHS.review} element={<Review />} />
        <Route path={PATHS.reviewAi} element={<AiReview />} />
        <Route path={PATHS.sharedLibrary} element={<SharedLibraryPage />} />
        <Route path={PATHS.quote} element={<Quote />} />
      </Route>
      {/* 없는 주소는 첫 화면으로 */}
      <Route path="*" element={<Navigate to={PATHS.guest} replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;