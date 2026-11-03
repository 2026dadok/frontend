import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";

const SECTIONS = [
  { id: "intro", label: "서비스 소개" },
  { id: "features", label: "주요 기능" },
  { id: "guide", label: "이용 가이드" },
];

// 로그인 전 화면들(첫 화면, 이용약관, 개인정보 처리방침)의 푸터.
// onSection 이 있으면(첫 화면) 그 부분으로 스크롤하고, 없으면 첫 화면으로 이동한다.
const SiteFooter = ({ onSection }) => {
  const navigate = useNavigate();
  const goSection = (id) => (onSection ? onSection(id) : navigate(PATHS.guest));

  return (
    <footer className="ld-footer">
      <div className="ld-footer-top">
        <div className="ld-footer-brand">
          <strong>다독다독</strong>
          <span>다독(多讀)이 다독이는 곳</span>
        </div>
        <nav aria-label="푸터 메뉴">
          {SECTIONS.map((item) => (
            <button key={item.id} type="button" onClick={() => goSection(item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => navigate(PATHS.login)}>로그인</button>
        </nav>
      </div>
      <div className="ld-footer-bottom">
        <nav className="ld-footer-legal" aria-label="약관 및 정책">
          <Link to={PATHS.terms}>이용약관</Link>
          <Link to={PATHS.privacy} className="strong">개인정보 처리방침</Link>
        </nav>
        <small>© 2026 다독다독. All rights reserved.</small>
      </div>
    </footer>
  );
};

export default SiteFooter;
