import { useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import logoImg from "../../images/dadokdadok.png";
import laptopImg from "../../images/laptop.png";
import "./Landing.css";

// 로그인 전 첫 화면(서비스 소개).
// 화면 캡처 이미지는 src/images/landing 에 아래 이름으로 넣으면 자동으로 들어간다. 없으면 빈 자리(카드)로 보인다.
//   feature-library, feature-shared, feature-timer, feature-rank, guide-signup, guide-read, guide-record
//   (확장자 png / jpg / jpeg / webp)
const LANDING_IMAGES = Object.fromEntries(
  Object.entries(import.meta.glob("../../images/landing/*.{png,jpg,jpeg,webp}", { eager: true, import: "default" })).map(
    ([path, url]) => [path.split("/").pop().replace(/\.\w+$/, ""), url]
  )
);

const Shot = ({ name, label, className }) =>
  LANDING_IMAGES[name] ? (
    <img className={`ld-shot ${className ?? ""}`} src={LANDING_IMAGES[name]} alt={label} />
  ) : (
    <div className={`ld-shot empty ${className ?? ""}`} role="img" aria-label={label}>
      {label}
    </div>
  );

const FEATURES = [
  {
    no: "01",
    title: "나의 서재",
    image: "feature-library",
    text: [
      "내가 완독한 책과 읽고 있는 책을 한 눈에 볼 수 있습니다.",
      "오늘 읽은 만큼 물드는 캘린더, 그 색들이 모여 나의 독서 계절을 그려요.",
      "마지막 장을 덮은 순간의 마음을 감상문으로 남겨, 시간이 지나도 그날의 여운을 다시 꺼내볼 수 있어요.",
    ],
  },
  {
    no: "02",
    title: "공동 서재",
    image: "feature-shared",
    text: [
      "친구나 취향이 비슷한 사람과 같은 책을 함께 읽는 서재를 만들 수 있어요.",
      "서로의 진행 상황을 실시간으로 확인하면서, 혼자 읽을 때보다 더 오래 완독을 이어갈 수 있어요.",
      "다 읽은 뒤에는 함께 토론하고 감상문을 나누며, 책 한 권을 더 깊이 이해하게 돼요.",
    ],
  },
  {
    no: "03",
    title: "독서 타이머",
    image: "feature-timer",
    text: [
      "읽을 책을 고르면, 오늘 읽을 만큼의 시간을 스톱워치처럼 맞추고 시작해요.",
      "정해진 시간만큼만 읽으니 부담 없이 시작할 수 있고, 그 시간이 하루하루 조금씩 늘어나요.",
      "어제보다 오늘 조금 더 길어진 시간이, 결국 나의 독서 습관이 됩니다.",
    ],
  },
  {
    no: "04",
    title: "주간 경쟁",
    image: "feature-rank",
    text: [
      "매주 비슷한 속도로 읽는 사람들과 나란히 서서, 함께 한 주를 완주해요.",
      "쌓인 시간과 페이지가 순위가 되고, 그 순위가 다시 다음 페이지를 넘기게 하는 힘이 돼요.",
      "내가 책장을 넘긴 시간이 그대로 순위가 되니, 읽는 순간순간이 곧 나의 기록이 돼요.",
    ],
  },
];

const GuideIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "person" && (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5H4z" />
      </>
    )}
    {name === "book" && <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4zM5 18a2 2 0 0 1 2-2h12M10 4v6l2-1.5L14 10V4" />}
    {name === "write" && <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />}
  </svg>
);

const GUIDES = [
  { no: "01", icon: "person", title: "회원가입하기", text: "간단한 정보만 입력하고\n여정을 시작해요", image: "guide-signup" },
  { no: "02", icon: "book", title: "책을 선택하고 읽기", text: "마음에 드는 책을 선택하고\n지금 바로 읽기 시작하세요", image: "guide-read" },
  { no: "03", icon: "write", title: "그 날을 기록하기", text: "나의 독서를 기록해요", image: "guide-record" },
];

const NAV = [
  { id: "intro", label: "서비스 소개" },
  { id: "features", label: "주요 기능" },
  { id: "guide", label: "이용 가이드" },
];

const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

// 로고: 한자처럼 생긴 글자(이미지)는 왼쪽에서, '다독'(글자)은 오른쪽에서 들어와 가운데서 만난다
const HeroLogo = () => (
  <h1 className="ld-logo" aria-label="다독다독">
    <span className="ld-logo-glyph" aria-hidden="true">
      <img src={logoImg} alt="" />
    </span>
    <span className="ld-logo-text" aria-hidden="true">다독</span>
  </h1>
);

const Landing = () => {
  const navigate = useNavigate();
  const goLogin = () => navigate(PATHS.login);

  return (
    <div className="ld">
      <header className="ld-header">
        <nav className="ld-nav" aria-label="소개 메뉴">
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => scrollToSection(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="ld-login" onClick={goLogin}>로그인</button>
      </header>

      <main>
        <section className="ld-hero">
          <HeroLogo />
          <p className="ld-hero-title">다독(多讀)이 다독이는 곳</p>
          <p className="ld-hero-sub">나의 독서 기록부터 함께 읽는 공동서재까지, 다독다독이 당신의 다독을 응원합니다.</p>
          <img className="ld-shot hero" src={laptopImg} alt="다독다독 화면 모음" />
        </section>

        <section id="intro" className="ld-intro">
          <h2>다독다독은 어떤 서비스인가요?</h2>
          <p>
            다독다독은 시간을 비롯한 나의 독서를 기록하고, 생각을 남기며
            <br />
            건강한 독서 습관을 만들고 함께 읽는 즐거움을 경험하는
            <br />
            독서 플랫폼입니다.
          </p>
        </section>

        <section id="features" className="ld-features">
          <h2>주요 기능</h2>
          {FEATURES.map((f, i) => (
            <article key={f.no} className={`ld-feature ${i % 2 ? "reverse tinted" : ""}`}>
              <div className="ld-feature-text">
                <span className="ld-badge">{f.no}</span>
                <h3>{f.title}</h3>
                {f.text.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <Shot name={f.image} label={`${f.title} 화면 이미지`} />
            </article>
          ))}
        </section>

        <section id="guide" className="ld-guide">
          <h2>이용 가이드</h2>
          <p className="ld-guide-sub">다독다독은 이렇게 시작해요</p>
          <ol className="ld-guide-cards">
            {GUIDES.map((g) => (
              <li key={g.no}>
                <span className="ld-badge big">{g.no}</span>
                <GuideIcon name={g.icon} />
                <h3>{g.title}</h3>
                <p>{g.text}</p>
                <Shot name={g.image} label={`${g.title} 화면 이미지`} className="small" />
              </li>
            ))}
          </ol>
        </section>
      </main>

      {/* TODO: 임시 푸터. 들어갈 내용(팀 정보·문의처 등)이 정해지면 교체 */}
      <footer className="ld-footer">
        <div>
          <strong>다독다독</strong>
          <span>다독(多讀)이 다독이는 곳</span>
        </div>
        <nav aria-label="푸터 메뉴">
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => scrollToSection(item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={goLogin}>로그인</button>
        </nav>
        <small>© 2026 다독다독. All rights reserved.</small>
      </footer>
    </div>
  );
};

export default Landing;
