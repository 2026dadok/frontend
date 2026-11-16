import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../routes";
import SiteFooter from "../landing/SiteFooter";
import { EFFECTIVE_DATE } from "./legalDocs";
import glyphImg from "../../images/dadok-glyph.png";
import "../landing/Landing.css"; // 첫 화면과 같은 배경·푸터
import "./Legal.css";

// 이용약관 / 개인정보 처리방침 화면. doc: legalDocs.js 의 TERMS 또는 PRIVACY
const LegalPage = ({ doc }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = `${doc.title} | 다독다독`;
    return () => {
      document.title = prevTitle;
    };
  }, [doc]);

  return (
    <div className="ld lg">
      <header className="lg-header">
        {/* 로고: 누르면 항상 소개 화면(맨 위)으로 */}
        <Link to={PATHS.guest} className="lg-home" aria-label="다독다독 소개 화면으로" onClick={() => window.scrollTo(0, 0)}>
          <img src={glyphImg} alt="" />
        </Link>
        <nav aria-label="약관 및 정책">
          <Link to={PATHS.terms} aria-current={doc.title === "이용약관" ? "page" : undefined}>이용약관</Link>
          <Link to={PATHS.privacy} aria-current={doc.title === "개인정보 처리방침" ? "page" : undefined}>개인정보 처리방침</Link>
        </nav>
      </header>

      <main className="lg-main">
        <h1>{doc.title}</h1>
        <p className="lg-meta">시행일 {EFFECTIVE_DATE}</p>
        {doc.intro && <p className="lg-intro">{doc.intro}</p>}

        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body?.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.after?.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
};

export default LegalPage;
