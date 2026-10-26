import { useCallback, useMemo, useState } from "react";
import CompleteBadge from "../../components/CompleteBadge";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { addCommentary, daysSince, getMyLibrary, getSharedLibrary } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import { DEMO_COMMENTARIES, fetchFriendCommentaries, fetchMyCommentaries } from "./reviewApi";
import { CommentaryDetailModal, CommentaryWriteModal } from "./ReviewModals";
import { formatDate } from "./format";
import mascotImg from "../../images/mascot.png";
import "../bookSearch/BookSearch.css"; // 알림창(.bs-toast)과 오른쪽 위 XP(.bs-xp) 모양을 같이 쓴다
import "./Review.css";

const TOAST_MS = 2000;

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
  const book = location.state?.book ?? getMyLibrary()[0] ?? getSharedLibrary()[0] ?? null;

  const [version, setVersion] = useState(0); // 감상문을 저장한 뒤 목록을 다시 읽기 위한 값
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [openDay, setOpenDay] = useState(null); // 전체 보기 팝업에 열린 일차

  const entries = useMemo(() => {
    if (!book) return [];
    if (demo) return DEMO_COMMENTARIES.map((e) => ({ ...e }));
    return isFriend ? fetchFriendCommentaries() : fetchMyCommentaries(book.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, demo, isFriend, version]);

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

  // 서고의 '감상문 쓰기'로 오면(?write=1) 오늘 일차의 감상문이 아직 없을 때 쓰기 팝업을 바로 연다
  const [writeDay, setWriteDay] = useState(() =>
    params.get("write") === "1" && !isFriend && book && !entries.some((e) => e.day === days[0]) ? days[0] : null
  );

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), TOAST_MS);
  }, []);

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
                <img src={book.cover} alt={book.title} />
                {completedDay && <CompleteBadge className="review-badge" />}
              </div>
              <figcaption>{book.title}</figcaption>
            </figure>
            <p className="review-intro">{book.intro || "등록된 책 소개가 없습니다."}</p>
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
