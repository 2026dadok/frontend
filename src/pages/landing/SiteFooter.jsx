import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import glyphImg from "../../images/dadok-glyph.png";
import daImg from "../../images/da.png";
import dokImg from "../../images/dok.png";
import githubImg from "../../images/github.png";

const GITHUB_URL = "https://github.com/2026dadok"; // 팀 organization

const SECTIONS = [
  { id: "intro", label: "서비스 소개" },
  { id: "features", label: "주요 기능" },
  { id: "guide", label: "이용 가이드" },
];

const SiteFooter = ({ onSection }) => {
  const navigate = useNavigate();
  const goSection = (id) => (onSection ? onSection(id) : navigate(PATHS.guest));

  return (
    <footer className="ld-footer">
      <div className="ld-footer-main">
        <div className="ld-footer-brand">
          <p className="ld-footer-logo" role="img" aria-label="다독다독">
            <img className="glyph" src={glyphImg} alt="" />
            <span className="ld-logo-rest">
              <img className="da" src={daImg} alt="" />
              <img className="dok" src={dokImg} alt="" />
            </span>
          </p>
          <p>
            다독(多讀)이 다독이는 곳.
            <br />
            오늘 읽은 한 쪽이 내일의 습관이 돼요.
          </p>
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
        <div className="ld-footer-credit">
          <small>© 2026 다독다독 · 제작자 : 동심공제 · 책 정보 제공 YES24</small>
          <a className="ld-footer-github" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="동심공제팀 깃허브 (새 탭)">
            <img src={githubImg} alt="" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
