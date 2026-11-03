import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { PATHS } from "./routes";
import SignupFlow from "./pages/auth/SignupFlow";    // 1번: 경로 수정
import LoginForm from "./pages/auth/LoginForm";      // 1번
import FindAccount from "./pages/auth/FindAccount";  // 1번
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
        localStorage.setItem("token", accessToken); // 다른 API 호출이 이 값을 Authorization 헤더에 쓴다
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        // 화면에 쓸 내 정보 (예: 책 검색 > 공동서재). 로그인 응답에는 ID 만 있다.
        localStorage.setItem("user", JSON.stringify(profile));
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
  const loggedIn = Boolean(localStorage.getItem("token"));
  return loggedIn ? children : <Navigate to={PATHS.login} replace />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={PATHS.guest} replace />} />
      <Route path={PATHS.guest} element={<Landing />} />
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route path={PATHS.signup} element={<SignupPage />} />
      <Route path={PATHS.find} element={<FindPage />} />
      {/* TODO: 개발 중 임시로 인증 없이 열어둠. 완성 후 RequireAuth로 감싸기 */}
      {/* 타이머는 사이드바 없이 화면 전체를 쓴다 */}
      <Route path={PATHS.timer} element={<Timer />} />
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
      {/* 5번: 맨 아래에 추가 */}
      <Route path="*" element={<Navigate to={PATHS.guest} replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;