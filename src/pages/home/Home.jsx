import { useEffect, useState } from "react";
import CompleteBadge from "../../components/CompleteBadge";
import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import {
  fetchRecommendedBooks,
  fetchMyLibraryBooks,
  fetchSharedLibraryBooks,
  loadMainPage,
  fetchRandomQuote,
} from "./homeApi";
import { getDraft } from "../review/reviewExtras";
import "./Home.css";

import xpIcon from "../../images/icon-xp.png";
import calendarIcon from "../../images/icon-calendar.png";
import giftBigIcon from "../../images/icon-gift-big.png";
import giftSmallIcon from "../../images/icon-gift.png";
import mascotImg from "../../images/mascot.png";

const SHELF_MAX_BOOKS = 5; // 책 최대 5권 + 항상 마지막에 + 칸

// 퀘스트 내용·진행도·완료 여부는 모두 백엔드(GET /auth/main_page) 값만 쓴다. 프런트가 정하지 않는다.
// 서버 응답을 받기 전이나 실패했을 때는 안내 문구만 보여준다.
const LOADING = undefined; // useLoad 가 아직 응답을 받지 못함
// 불러오지 못했을 때는 0 대신 "-" 로 보여준다 (진짜 0 과 헷갈리지 않게)
const EMPTY_WEEKLY = { title: "", current: null, goal: null, xp: null };
const EMPTY_DAILY = { quests: [], allClearXp: null };

const useLoad = (loader, initial) => {
  const [data, setData] = useState(initial);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(loader)
      .then((v) => alive && v !== undefined && setData(v))
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, [loader]);
  return data;
};

const Shelf = ({ title, books, to }) => {
  const slots = books.slice(0, SHELF_MAX_BOOKS);
  return (
    <section className="home-card home-shelf">
      <h2 className="home-shelf-title">{title}</h2>
      <Link to={to} className="home-more">전체 보기</Link>
      <div className="home-shelf-books">
        {slots.map((b) => (
          <Link key={`${b.id}-${b.friendId ?? ""}`} to={to} className="home-shelf-book" aria-label={`${b.title} 서고에서 보기`}>
            <img src={b.cover} alt={b.title} />
            {b.completed && <CompleteBadge className="home-badge" />}
          </Link>
        ))}
        <Link to={PATHS.search} className="home-shelf-add" aria-label={`${title}에 책 추가 (책 검색으로 이동)`}>
          <span>+</span>
        </Link>
      </div>
    </section>
  );
};

const Recommend = ({ books, onOpen }) => (
  <section className="home-card home-recommend">
    <h2>이달의 추천 도서</h2>
    <p>그리움을 닮은 계절, 그리움을 닮은 소설</p>
    <div className="home-recommend-books">
      {books.map((b) => (
        <button key={b.id} type="button" onClick={() => onOpen(b)} aria-label={`${b.title} 상세 보기`}>
          <img src={b.cover} alt={b.title} />
        </button>
      ))}
    </div>
  </section>
);

const Xp = ({ value, className }) => (
  <span className={`home-xp ${className ?? ""}`}>XP {value ?? "-"}</span>
);

const WeeklyQuest = ({ quest, note }) => {
  const percent = Math.min(100, (quest.current / quest.goal) * 100) || 0;
  return (
    <section className="home-card home-weekly">
      <div className="home-quest-head">
        <span className="home-quest-icon green">
          <i style={{ maskImage: `url(${calendarIcon})`, WebkitMaskImage: `url(${calendarIcon})` }} />
        </span>
        <h2>주간 퀘스트</h2>
      </div>
      <p className="home-weekly-title">{quest.title || note}</p>
      <div className="home-weekly-bar">
        <div className="home-progress">
          <div style={{ width: `${percent}%` }} />
        </div>
        <span>{quest.current ?? "-"} / {quest.goal ?? "-"}</span>
      </div>
      <div className="home-weekly-reward">
        <img src={giftBigIcon} alt="" />
        <Xp value={quest.xp} />
      </div>
    </section>
  );
};

const DailyQuest = ({ daily, note }) => (
  <section className="home-card home-daily">
    <div className="home-quest-head">
      <span className="home-quest-icon"><img src={calendarIcon} alt="" /></span>
      <h2>일일 퀘스트</h2>
    </div>
    <ul>
      {daily.quests.length === 0 && <li className="home-daily-note">{note}</li>}
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

// 감상문을 쓰다가 나갔으면 말풍선이 이어 쓰기를 권한다 (피그마 '감상문 작성 도중 이탈')
//   쓰기 창에서 나감: 말풍선을 누르면 그 일차의 쓰기 창이 다시 열린다
//   AI 감상문 채팅에서 나감: [AI감상문 바로 가기] 를 누르면 나눈 이야기에 이어서 채팅한다
const DraftBubble = ({ draft, onResume }) => {
  const where = `${draft.book.title}${draft.day ? ` ${draft.day}일차` : ""}`;
  if (draft.kind === "ai") {
    return (
      <div className="home-quote">
        <div className="home-quote-bubble home-draft ai">
          <span className="home-draft-ask">감상문을 마저 써볼까요?</span>
          <button type="button" className="home-quote-link" onClick={onResume}>
            AI감상문 바로 가기
          </button>
          <small>{where}</small>
        </div>
        <img className="home-mascot" src={mascotImg} alt="" />
      </div>
    );
  }
  return (
    <div className="home-quote">
      <button type="button" className="home-quote-bubble home-draft" onClick={onResume}>
        <span className="home-draft-ask">감상문을 마저 써볼까요?</span>
        <small>{where}</small>
      </button>
      <img className="home-mascot" src={mascotImg} alt="" />
    </div>
  );
};

const QuoteBubble = ({ quote }) => (
  <div className="home-quote">
    <div className="home-quote-bubble">
      <div className="home-quote-default">
        {quote ? (
          <>
            <p>{quote.text}</p>
            <small>{[quote.author, quote.book && `< ${quote.book} >`].filter(Boolean).join(" - ")}</small>
          </>
        ) : (
          <p>인용구 노트에 인상 깊은 문장을 적어보세요.</p>
        )}
      </div>
      {/* 마우스를 올리면(또는 키보드 포커스) 인용구 노트로 가는 버튼이 나타난다 */}
      <div className="home-quote-hover">
        <p>인상깊은 문장을 남기러 가볼까요?</p>
        <Link to={PATHS.quote} className="home-quote-link">인용구 노트 바로가기</Link>
      </div>
    </div>
    <img className="home-mascot" src={mascotImg} alt="" />
  </div>
);

const Home = () => {
  const myBooks = useLoad(fetchMyLibraryBooks, []);
  const sharedBooks = useLoad(fetchSharedLibraryBooks, []);
  const recommended = useLoad(fetchRecommendedBooks, []);
  const main = useLoad(loadMainPage, LOADING); // null = 서버 없음·실패
  const questNote = main === LOADING ? "퀘스트를 불러오는 중이에요." : "퀘스트를 불러오지 못했어요.";
  const weekly = main?.weekly ?? EMPTY_WEEKLY;
  const daily = main?.daily ?? EMPTY_DAILY;
  const totalXp = main?.totalXp ?? "-"; // 불러오기 전·실패하면 "-"
  const quote = useLoad(fetchRandomQuote, null);
  const scale = useFitScale();
  const navigate = useNavigate();
  // 추천 도서를 누르면 책 검색 페이지의 책 상세(3번 화면)를 바로 연다
  const openRecommended = (book) => navigate(`${PATHS.search}?view=detail`, { state: { book } });
  const [draft] = useState(getDraft); // 쓰다 만 감상문 (없으면 null)
  const resumeDraft = () =>
    draft.kind === "ai"
      ? navigate(PATHS.reviewAi, { state: { book: draft.book, resume: true } })
      : navigate(`${PATHS.review}?write=1`, { state: { book: draft.book, resumeDay: draft.day } });

  return (
    <div className="home">
      <div className="home-xp-total">
        <i style={{ maskImage: `url(${xpIcon})`, WebkitMaskImage: `url(${xpIcon})` }} aria-hidden="true" />
        <span>{totalXp}</span>
      </div>

      <div className="home-stage" style={{ "--s": scale }}>
        <div className="home-grid">
          <div className="home-left">
            <Shelf title="나의 서재" books={myBooks} to={`${PATHS.library}?tab=my`} />
            <Shelf title="공동 서재" books={sharedBooks} to={`${PATHS.library}?tab=shared`} />
            <Recommend books={recommended} onOpen={openRecommended} />
          </div>
          <div className="home-right">
            <WeeklyQuest quest={weekly} note={questNote} />
            <DailyQuest daily={daily} note={main?.daily ? "오늘의 퀘스트가 없어요." : questNote} />
            {draft ? <DraftBubble draft={draft} onResume={resumeDraft} /> : <QuoteBubble quote={quote} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
