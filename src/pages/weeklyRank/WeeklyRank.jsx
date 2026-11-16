import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import useMyImage from "../../hooks/useMyImage";
import { Avatar, XpTotal } from "../bookSearch/parts";
import { getMe } from "../bookSearch/bookStore";
import { showXpToast } from "../../components/xpToast/xpToastBus";
import { currentWeekKey, fetchWeekCompetition, formatMinutes } from "./weeklyRankApi";
import tierBronze from "../../images/tier-bronze.png";
import tierSilver from "../../images/tier-silver.png";
import tierGold from "../../images/tier-gold.png";
import tierDiamond from "../../images/tier-diamond.png";
import tierPlatinum from "../../images/tier-platinum.png";
import tierByeongyeon from "../../images/tier-byeongyeon.png";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas, .bs-xp)을 책 검색과 같이 쓴다
import "./WeeklyRank.css";

// 백엔드가 주는 티어 이름 → 이미지. TODO: 백엔드의 티어 값(한글 이름인지 코드인지)이 정해지면 키를 맞춘다
const TIER_IMAGES = {
  동: tierBronze,
  은: tierSilver,
  금: tierGold,
  금강: tierDiamond,
  백금: tierPlatinum,
  병연: tierByeongyeon,
  병연티어: tierByeongyeon,
};

// 지난주 결과 알림을 띄운 주. 새 주(월요일 0시)에 처음 들어올 때 한 번만 띄운다.
const shownWeekKey = () => `weekResultShown:${getMe().key}`;

const showLastWeekResult = (lastWeek) => {
  if (!lastWeek) return;
  const week = currentWeekKey();
  try {
    // 화면 상태만 기억한다 (탭을 닫으면 지워진다). 데이터가 아니라 "알림을 이미 띄웠는지" 표시라서 sessionStorage 에 둔다
    if (sessionStorage.getItem(shownWeekKey()) === week) return;
    sessionStorage.setItem(shownWeekKey(), week);
  } catch {
    // 저장이 안 되는 브라우저에서는 들어올 때마다 보여준다
  }
  showXpToast({ title: `주간 경쟁을 ${lastWeek.rank}등으로 끝났습니다`, xp: lastWeek.xp });
};

const RankRow = ({ ranker }) => (
  <li className={`rk-row ${ranker.me ? "me" : ""}`}>
    <span className="rk-rank">{ranker.rank ? `${ranker.rank}위` : "-위"}</span>
    {ranker.image ? <img className="rk-avatar" src={ranker.image} alt="" /> : <Avatar size={40} />}
    <span className="rk-name">
      {ranker.title && <span className="rk-title">{ranker.title} </span>}
      {ranker.name}
      {ranker.me && ranker.name !== "나" && " (나)"}
    </span>
    <span className="rk-time">{formatMinutes(ranker.minutes)}</span>
  </li>
);

const ReadingBook = ({ book, onRead, onLibrary }) => (
  <section className="rk-card rk-reading">
    {book ? (
      <>
        <p className="rk-pages">{book.readPage} / {book.totalPage}p</p>
        <img className="rk-reading-cover" src={book.cover} alt={book.title} />
        <div className="rk-progress">
          <div className="track">
            <div style={{ width: `${book.percent}%` }} />
          </div>
          <span>{book.percent}%</span>
        </div>
      </>
    ) : (
      <p className="rk-reading-empty">읽고 있는 책이 없어요.</p>
    )}
    <div className="rk-reading-actions">
      <button type="button" disabled={!book} onClick={onRead}>바로 읽기</button>
      <button type="button" onClick={onLibrary}>내 서재로 가기</button>
    </div>
  </section>
);

// 주간 경쟁: 티어, 경쟁자들이 읽는 책, 이번 주 읽은 시간 순위, 내가 읽고 있는 책
const WeeklyRank = () => {
  const scale = useFitScale();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const myImage = useMyImage("profile"); // 마이페이지에서 바꾼 내 프로필 사진

  useEffect(() => {
    let alive = true;
    fetchWeekCompetition().then((result) => {
      if (!alive) return;
      setData(result);
      showLastWeekResult(result.lastWeek);
    });
    return () => {
      alive = false;
    };
  }, []);

  const openBook = (book) => navigate(`${PATHS.search}?view=detail`, { state: { book } });
  const readNow = () => navigate(PATHS.timer, { state: { book: data.readingBook } });
  const goLibrary = () => navigate(`${PATHS.library}?tab=my`);

  return (
    <div className="bs rk-page">
      <XpTotal />

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          <section className="rk-card rk-tier" aria-label={`내 티어 ${data?.tier ?? ""}`}>
            {TIER_IMAGES[data?.tier] ? (
              <img className="rk-tier-art" src={TIER_IMAGES[data.tier]} alt={`${data.tier} 티어`} />
            ) : (
              data?.tier && <div className="rk-tier-art empty">{data.tier}</div> // 모르는 티어 값이면 이름만 보여준다. 값이 없으면 빈 카드
            )}
          </section>

          <section className="rk-competitors">
            <h2>경쟁자들이 이런 책을 읽고 있어요!</h2>
            <div className="rk-competitor-books">
              {data?.competitorBooks.map((book, i) => (
                <button key={`${book.id ?? book.isbn}-${i}`} type="button" onClick={() => openBook(book)} aria-label={`${book.title} 상세 보기`}>
                  <img src={book.cover} alt={book.title} />
                </button>
              ))}
              {data && data.competitorBooks.length === 0 && (
                <p className="rk-empty">{data.needLogin ? "로그인하면 경쟁자들이 읽는 책을 볼 수 있어요." : "아직 경쟁자들이 읽는 책이 없어요."}</p>
              )}
            </div>
          </section>

          <section className="rk-card rk-ranking">
            <h2>순위</h2>
            {data?.needLogin && <p className="rk-ranking-empty">로그인이 필요해요.</p>}
            {data && !data.needLogin && (
              <>
                <ul className="rk-mine">
                  <RankRow ranker={{ ...data.me, image: myImage || data.me.image }} />
                </ul>
                <ul className="rk-list">
                  {data.ranking.map((ranker, i) => (
                    <RankRow key={`${ranker.name}-${i}`} ranker={ranker} />
                  ))}
                </ul>
                {data.ranking.length === 0 && <p className="rk-ranking-empty">아직 이번 주 순위가 없어요.</p>}
              </>
            )}
          </section>

          {data && <ReadingBook book={data.readingBook} onRead={readNow} onLibrary={goLibrary} />}
        </div>
      </div>
    </div>
  );
};

export default WeeklyRank;
