import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import logoImg from "../../images/logo.png";

const SECTIONS = [
  { id: "intro", label: "서비스 소개" },
  { id: "features", label: "주요 기능" },
  { id: "guide", label: "이용 가이드" },
];

// 로그인 전 화면들(첫 화면, 이용약관, 개인정보 처리방침)의 푸터.
// 왼쪽: 로고·소개·시작하기 / 오른쪽: 메뉴 두 묶음(서비스, 계정) / 맨 아래: 약관 링크·저작권
// onSection 이 있으면(첫 화면) 그 부분으로 스크롤하고, 없으면 첫 화면으로 이동한다.
const SiteFooter = ({ onSection }) => {
  const navigate = useNavigate();
  const goSection = (id) => (onSection ? onSection(id) : navigate(PATHS.guest));

  return (
    <footer className="ld-footer">
      <div className="ld-footer-main">
        <div className="ld-footer-brand">
          <div className="ld-footer-logo">
            <img src={logoImg} alt="" />
            <strong>다독다독</strong>
          </div>
          <p>
            다독(多讀)이 다독이는 곳.
            <br />
            오늘 읽은 한 쪽이 내일의 습관이 돼요.
          </p>
          <button type="button" className="ld-footer-cta" onClick={() => navigate(PATHS.signup)}>
            지금 시작하기 <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="ld-footer-menus">
          <nav aria-label="서비스">
            <h2>서비스</h2>
            {SECTIONS.map((item) => (
              <button key={item.id} type="button" onClick={() => goSection(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
          <nav aria-label="계정">
            <h2>계정</h2>
            <Link to={PATHS.login}>로그인</Link>
            <Link to={PATHS.signup}>회원가입</Link>
          </nav>
        </div>
      </div>

      <div className="ld-footer-bottom">
        <nav className="ld-footer-legal" aria-label="약관 및 정책">
          <Link to={PATHS.terms}>이용약관</Link>
          <Link to={PATHS.privacy} className="strong">개인정보 처리방침</Link>
        </nav>
        <small>© 2026 다독다독 · 책 정보 제공 YES24</small>
      </div>
    </footer>
  );
};

export default SiteFooter;
