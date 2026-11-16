import { useEffect, useMemo, useState } from "react";
import CompleteBadge from "../../components/CompleteBadge";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import useToast from "../../hooks/useToast";
import { fetchBookIntro } from "../bookSearch/bookSearchApi";
import { addCommentary, daysSince, getMyLibrary, getSharedLibrary, updateShelfBook } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import { DEMO_COMMENTARIES, fetchFriendCommentaries, fetchMyCommentaries, loadMyCommentaries } from "./reviewApi";
import { CommentaryDetailModal, CommentaryWriteModal } from "./ReviewModals";
import { formatDate } from "./format";
import mascotImg from "../../images/mascot.png";
import "../bookSearch/BookSearch.css"; // 알림창(.bs-toast)과 오른쪽 위 XP(.bs-xp) 모양을 같이 쓴다
import "./Review.css";

// 책 소개가 칸을 넘치면(스크롤 가능) 글이 더 남아 있는 가장자리를 흐리게(회색처럼) 보이게 한다.
//   맨 위: 아래쪽만 / 중간: 위·아래 모두 / 맨 끝: 위쪽만 (내리면 위로 올라간 글이 회색이 된다)
// 글 위에 흰색 그라데이션을 덮는 방식이다. --top, --bottom (0~1) = 위·아래에 가려진 글의 양(FADE_RANGE 이상이면 1).
// 칸을 넘지 않는 짧은 소개는 둘 다 0이라 전부 검정.
const FADE_RANGE = 80; // px
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const updateIntroFade = (el) => {
  const hiddenAbove = el.scrollTop;
  const hiddenBelow = el.scrollHeight - el.clientHeight - el.scrollTop;
  const wrap = el.parentElement;
  wrap.style.setProperty("--top", clamp01(hiddenAbove / FADE_RANGE).toFixed(3));
  wrap.style.setProperty("--bottom", clamp01(hiddenBelow / FADE_RANGE).toFixed(3));
};

const DayCard = ({ day, entry, completed, canWrite, onOpen, onWrite }) => (
  <article
    className={`review-day ${entry ? "clickable" : ""}`}
    tabIndex={entry ? 0 : undefined}
    onClick={entry ? onOpen : undefined}
    onKeyDown={(e) => entry && e.key === "Enter" && onOpen()}
  >
    <h3>
      {day}일차{completed && " / 완독"}
    </h3>
    <div className="review-day-body">
      {entry ? (
        <p className="review-day-text">{entry.content}</p>
      ) : (
        <>
          <p className="review-day-empty">이 감상문은 적지 않으셨어요...</p>
          {canWrite && (
            <button type="button" className="review-write-btn" onClick={(e) => { e.stopPropagation(); onWrite(); }}>
              감상문 쓰러가기
            </button>
          )}
        </>
      )}
    </div>
    <time>{entry ? formatDate(entry.date) : "????. ??. ??"}</time>
  </article>
);

// 감상문 화면: 책 소개 + 읽은 날(N일차)별 감상문.
//   나의 감상문:   /review            (공동서재 > 내 감상평 보기)
//   친구의 감상문: /review?who=friend (공동서재 > 친구 감상평 보기)
//   쓰기 팝업:     /review?write=1    (서고 > 감상문 쓰기: 오늘 일차의 감상문이 아직 없으면 쓰기 팝업부터 연다)
const Review = () => {
  const scale = useFitScale({ fitHeight: false }); // 위아래로 스크롤되는 페이지라 가로 폭만 맞춘다
  const location = useLocation();
  const [params] = useSearchParams();
  const isFriend = params.get("who") === "friend";
  const demo = params.get("demo") === "1"; // 디자인 확인용 예시 데이터

  // 누른 책. 주소로 바로 들어오면 서재의 첫 책을 보여준다. (TODO: 책을 가리키는 값으로 교체)
  // (첫 책은 처음 한 번만 읽는다. 그릴 때마다 읽으면 매번 새 객체가 되어 아래 계산이 계속 다시 돈다)
  const [firstBook] = useState(() => getMyLibrary()[0] ?? getSharedLibrary()[0] ?? null);
  const book = location.state?.book ?? firstBook;

  const [version, setVersion] = useState(0); // 감상문을 저장한 뒤 목록을 다시 읽기 위한 값
  const [toast, showToast] = useToast();
  const [saving, setSaving] = useState(false);
  const [openDay, setOpenDay] = useState(null); // 전체 보기 팝업에 열린 일차

  const entries = useMemo(() => {
    if (!book) return [];
    if (demo) return DEMO_COMMENTARIES.map((e) => ({ ...e }));
    return isFriend ? fetchFriendCommentaries() : fetchMyCommentaries(book.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, demo, isFriend, version]);

  // 서버의 내 감상문(GET /bookstore/feeling_page)을 받아 오면 목록을 다시 그린다
  useEffect(() => {
    if (!book || isFriend || demo) return undefined;
    let alive = true;
    loadMyCommentaries(book).then(() => alive && setVersion((v) => v + 1));
    return () => {
      alive = false;
    };
  }, [book, isFriend, demo]);

  const { days, completedDay } = useMemo(() => {
    const lastWritten = Math.max(0, ...entries.map((e) => e.day));
    const startIso = book?.startedAt ?? book?.addedAt;
    const sinceStart = startIso ? daysSince(startIso) + 1 : 1;
    const total = Math.max(1, lastWritten, demo ? 0 : sinceStart);
    return {
      days: Array.from({ length: total }, (_, i) => total - i),
      completedDay: book?.completed || demo ? total : null,
    };
  }, [entries, book, demo]);

  // 서재에 소개가 저장되지 않은 책은 YES24에서 다시 가져와서 채운다. introFetched[책 id] 가 undefined 면 가져오는 중.
  const [introFetched, setIntroFetched] = useState({});
  useEffect(() => {
    if (!book || book.intro || introFetched[book.id] !== undefined) return undefined;
    let alive = true;
    fetchBookIntro(book)
      .then((intro) => {
        if (!alive) return;
        setIntroFetched((prev) => ({ ...prev, [book.id]: intro }));
        if (intro) updateShelfBook(book.id, { intro });
      })
      .catch(() => alive && setIntroFetched((prev) => ({ ...prev, [book.id]: "" })));
    return () => {
      alive = false;
    };
  }, [book, introFetched]);

  // 서고의 '감상문 쓰기'로 오면(?write=1) 오늘 일차의 감상문이 아직 없을 때 쓰기 팝업을 바로 연다
  const [writeDay, setWriteDay] = useState(() =>
    params.get("write") === "1" && !isFriend && book && !entries.some((e) => e.day === days[0]) ? days[0] : null
  );

  if (!book) {
    return (
      <p className="review-none">
        서재에서 책을 선택해주세요. <Link to={PATHS.library}>서고로 가기</Link>
      </p>
    );
  }

  const ownerName = isFriend ? `${book.friendName ?? "친구"}님` : "나";
  const entryOf = (day) => entries.find((e) => e.day === day);
  const dayLabel = (day) => `${day}일차${day === completedDay ? " | 완독" : ""}`;

  // 전체 보기 팝업에서 넘길 수 있는 일차 = 글이 있는 일차 (큰 번호 → 작은 번호)
  const writtenDays = days.filter((d) => entryOf(d));
  const openIndex = writtenDays.indexOf(openDay);
  const goPrev = openIndex > 0 ? () => setOpenDay(writtenDays[openIndex - 1]) : null;
  const goNext = openIndex >= 0 && openIndex < writtenDays.length - 1 ? () => setOpenDay(writtenDays[openIndex + 1]) : null;

  const submitCommentary = async (content) => {
    setSaving(true);
    const result = await addCommentary(book, writeDay, content);
    setSaving(false);
    if (result !== "saved") {
      showToast("감상문을 저장하지 못했어요.");
      return;
    }
    setWriteDay(null);
    setVersion((v) => v + 1);
    showToast("감상문을 저장했어요.");
  };

  return (
    <div className="review-page">
      <div className="review-xp">
        <XpTotal />
      </div>

      <div className="review-stage" style={{ "--s": scale }}>
        <div className="review-canvas">
          <h1 className="review-title">
            {isFriend ? ownerName : "나"}의 ‘<strong>{book.title}</strong>’ 감상문
          </h1>

          <section className="review-book">
            <figure>
              <div className="review-cover">
                <div className="review-cover-inner">
                  <img src={book.cover} alt={book.title} />
                  {completedDay && <CompleteBadge className="review-badge" />}
                </div>
              </div>
              <figcaption>{book.title}</figcaption>
            </figure>
            <div className="review-intro-wrap">
              <p
                className="review-intro"
                tabIndex={0}
                aria-label="책 소개"
                ref={(el) => el && updateIntroFade(el)}
                onScroll={(e) => updateIntroFade(e.currentTarget)}
              >
                {book.intro ||
                  introFetched[book.id] ||
                  (introFetched[book.id] === undefined ? "책 소개를 불러오는 중…" : "등록된 책 소개가 없습니다.")}
              </p>
              <i className="review-intro-fade top" aria-hidden="true" />
              <i className="review-intro-fade bottom" aria-hidden="true" />
            </div>
          </section>

          <hr className="review-divider" />

          <div className="review-grid">
            {days.map((day) => (
              <DayCard
                key={day}
                day={day}
                entry={entryOf(day)}
                completed={day === completedDay}
                canWrite={!isFriend && !demo}
                onOpen={() => setOpenDay(day)}
                onWrite={() => setWriteDay(day)}
              />
            ))}
          </div>

          <img className="review-mascot" src={mascotImg} alt="" />
        </div>
      </div>

      {openDay !== null && entryOf(openDay) && (
        <CommentaryDetailModal
          scale={scale}
          label={dayLabel(openDay)}
          entry={entryOf(openDay)}
          onPrev={goPrev}
          onNext={goNext}
          onClose={() => setOpenDay(null)}
        />
      )}
      {writeDay !== null && (
        <CommentaryWriteModal scale={scale} book={book} day={writeDay} saving={saving} onSubmit={submitCommentary} onClose={() => setWriteDay(null)} />
      )}

      <Toast message={toast} />
    </div>
  );
};

export default Review;
