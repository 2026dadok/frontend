import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../routes";
import {
  fetchRecommendedBooks,
  fetchMyLibraryBooks,
  fetchSharedLibraryBooks,
  fetchWeeklyQuest,
  fetchDailyQuests,
  fetchTotalXp,
  fetchRandomQuote,
} from "./homeApi";
import "./Home.css";

import xpIcon from "../../images/icon-xp.png";
import calendarIcon from "../../images/icon-calendar.png";
import giftBigIcon from "../../images/icon-gift-big.png";
import giftSmallIcon from "../../images/icon-gift.png";
import mascotImg from "../../images/mascot.png";

const SHELF_SLOTS = 4;

// 백엔드 연결 전/실패 시 화면 확인용
const FALLBACK_WEEKLY = { title: "이번주에 300페이지 읽기", current: 0, goal: 300, xp: 20 };
const FALLBACK_DAILY = {
  quests: [
    { id: 1, title: "일일 출석하기", xp: 10, done: false },
    { id: 2, title: "30분 독서하기", xp: 5, done: false },
    { id: 3, title: "새로운 도서 등록하기", xp: 10, done: false },
  ],
  allClearXp: 30,
};

const useLoad = (loader, initial) => {
  const [data, setData] = useState(initial);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(loader)
      .then((v) => alive && v != null && setData(v))
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, [loader]);
  return data;
};

const Shelf = ({ title, books, to }) => {
  const slots = books.slice(0, SHELF_SLOTS);
  const hasEmpty = slots.length < SHELF_SLOTS;
  return (
    <section className="home-card home-shelf">
      <h2 className="home-shelf-title">{title}</h2>
      <Link to={to} className="home-more">전체 보기</Link>
      <div className="home-shelf-books">
        {slots.map((b) => (
          <div key={b.id} className="home-shelf-book">
            <img src={b.cover} alt={b.title} />
            {b.completed && <span className="home-badge">완독</span>}
          </div>
        ))}
        {hasEmpty && (
          <Link to={to} className="home-shelf-add" aria-label={`${title}에 책 추가`}>
            <span>+</span>
          </Link>
        )}
      </div>
    </section>
  );
};

const Recommend = ({ books }) => (
  <section className="home-card home-recommend">
    <h2>이달의 추천 도서</h2>
    <p>그리움을 닮은 계절, 그리움을 닮은 소설</p>
    <div className="home-recommend-books">
      {books.map((b) => (
        <img key={b.id} src={b.cover} alt={b.title} />
      ))}
    </div>
  </section>
);

const Xp = ({ value, className }) => (
  <span className={`home-xp ${className ?? ""}`}>XP {value}</span>
);

const WeeklyQuest = ({ quest }) => {
  const percent = Math.min(100, (quest.current / quest.goal) * 100) || 0;
  return (
    <section className="home-card home-weekly">
      <div className="home-quest-head">
        <span className="home-quest-icon green">
          <i style={{ maskImage: `url(${calendarIcon})`, WebkitMaskImage: `url(${calendarIcon})` }} />
        </span>
        <h2>주간 퀘스트</h2>
      </div>
      <p className="home-weekly-title">{quest.title}</p>
      <div className="home-weekly-bar">
        <div className="home-progress">
          <div style={{ width: `${percent}%` }} />
        </div>
        <span>{quest.current} / {quest.goal}</span>
      </div>
      <div className="home-weekly-reward">
        <img src={giftBigIcon} alt="" />
        <Xp value={quest.xp} />
      </div>
    </section>
  );
};

const DailyQuest = ({ daily }) => (
  <section className="home-card home-daily">
    <div className="home-quest-head">
      <span className="home-quest-icon"><img src={calendarIcon} alt="" /></span>
      <h2>일일 퀘스트</h2>
    </div>
    <ul>
      {daily.quests.map((q) => (
        <li key={q.id}>
          <span className={`home-check ${q.done ? "done" : ""}`} />
          <span className="home-daily-title">{q.title}</span>
          <Xp value={q.xp} />
        </li>
      ))}
    </ul>
    <div className="home-daily-all">
      <img src={giftSmallIcon} alt="" />
      <span>일일 퀘스트 전체 완료 보상</span>
      <Xp value={daily.allClearXp} />
    </div>
  </section>
);

const QuoteBubble = ({ quote }) => (
  <div className="home-quote">
    <div className="home-quote-bubble">
      {quote ? (
        <>
          <p>{quote.text}</p>
          <small>{[quote.author, quote.book && `< ${quote.book} >`].filter(Boolean).join(" - ")}</small>
        </>
      ) : (
        <p>인용구 노트에 인상 깊은 문장을 적어보세요.</p>
      )}
    </div>
    <img className="home-mascot" src={mascotImg} alt="" />
  </div>
);

const Home = () => {
  const myBooks = useLoad(fetchMyLibraryBooks, []);
  const sharedBooks = useLoad(fetchSharedLibraryBooks, []);
  const recommended = useLoad(fetchRecommendedBooks, []);
  const weekly = useLoad(fetchWeeklyQuest, FALLBACK_WEEKLY);
  const daily = useLoad(fetchDailyQuests, FALLBACK_DAILY);
  const totalXp = useLoad(fetchTotalXp, 0);
  const [quote] = useState(fetchRandomQuote);

  return (
    <div className="home">
      <div className="home-xp-total">
        <img src={xpIcon} alt="" />
        <span>{totalXp}</span>
      </div>

      <div className="home-grid">
        <div className="home-left">
          <Shelf title="나의 서재" books={myBooks} to={PATHS.library} />
          <Shelf title="공동 서재" books={sharedBooks} to={PATHS.sharedLibrary} />
          <Recommend books={recommended} />
        </div>
        <div className="home-right">
          <WeeklyQuest quest={weekly} />
          <DailyQuest daily={daily} />
          <QuoteBubble quote={quote} />
        </div>
      </div>
    </div>
  );
};

export default Home;
