import { useEffect, useState } from "react";
import { fetchAuthorOtherBooks } from "./bookSearchApi";
import { deleteMyReview, getAddedCount, getMe, getReviews, saveMyReview, summarizeReviews, updateMyReview } from "./bookStore";
import { Avatar, StarInput, Stars } from "./parts";

const formatDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()} . ${pad(d.getMonth() + 1)} . ${pad(d.getDate())}`;
};

const MAX_REVIEW_LENGTH = 300; // 명세서: 감상문 300자 이하
const INTRO_FOLD_LENGTH = 160;

// 3·4번 화면: 책 상세. 왼쪽은 고정, 오른쪽 카드만 스크롤된다.
// 책이 바뀌면 부모에서 key={book.id} 로 새로 그린다.
const BookDetail = ({ book, onReadNow, onAddMine, onAddShared, onOpenOther, showToast }) => {
  const me = getMe();
  const [reviews, setReviews] = useState(() => getReviews(book.id));
  const mine = reviews.find((r) => r.userKey === me.key);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [content, setContent] = useState(mine?.content ?? "");
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false); // 내 리뷰 수정 중인지
  const [others, setOthers] = useState(null); // null = 불러오는 중

  useEffect(() => {
    let alive = true;
    fetchAuthorOtherBooks(book)
      .then((list) => alive && setOthers(list))
      .catch((e) => {
        console.error(e);
        if (alive) setOthers([]);
      });
    return () => {
      alive = false;
    };
  }, [book]);

  const { average } = summarizeReviews(reviews);
  const addedCount = getAddedCount(book.id); // 서재에 추가한 사람 수 (추가 버튼을 누르면 부모가 다시 그려서 갱신)
  // 내 리뷰도 이 목록에 같이 들어간다 (최신순)
  const reviewList = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const intro = book.intro ?? ""; // 주간 경쟁에서 오는 책은 소개가 없을 수 있다
  const foldable = intro.length > INTRO_FOLD_LENGTH;

  const submitReview = async () => {
    // 이미 쓴 리뷰: 처음엔 잠겨 있고 [수정]을 눌러야 고칠 수 있다. 저장은 백엔드가 받아줘야 반영된다.
    if (mine && !editing) {
      setEditing(true);
      return;
    }
    const text = content.trim();
    if (!mine && !rating) {
      showToast("별점을 선택해주세요.");
      return;
    }
    if (!text) {
      showToast("한줄평을 입력해주세요.");
      return;
    }
    if (mine) {
      const next = await updateMyReview(book.id, text);
      if (!next) {
        showToast("리뷰를 수정하지 못했어요.");
        return;
      }
      setReviews(next);
      setContent(text);
      setEditing(false);
      showToast("리뷰를 수정했어요.");
      return;
    }
    const next = await saveMyReview(book, { rating, content: text });
    if (!next) {
      showToast("리뷰를 저장하지 못했어요.");
      return;
    }
    setReviews(next);
    showToast("리뷰가 등록되었어요.");
  };

  // 내 리뷰 삭제 (DELETE /books/reviews). 서버가 지워줬을 때만 화면에서도 지운다
  const removeReview = async () => {
    if (!window.confirm("내 리뷰를 삭제할까요?")) return;
    const next = await deleteMyReview(book.id);
    if (!next) {
      showToast("리뷰를 삭제하지 못했어요.");
      return;
    }
    setReviews(next);
    setRating(0);
    setContent("");
    setEditing(false);
    showToast("리뷰를 삭제했어요.");
  };

  const cancelEdit = () => {
    setContent(mine?.content ?? "");
    setEditing(false);
  };

  return (
    <>
      <div className="bs-detail-left">
        <div className="bs-cover-card">
          <img src={book.cover} alt={book.title} />
        </div>
        <button type="button" className="bs-pill-btn big" onClick={() => onReadNow(book)}>
          바로 읽기
        </button>
        <button type="button" className="bs-pill-btn big" onClick={() => onAddMine(book)}>
          나의 서재 추가
        </button>
        <button type="button" className="bs-pill-btn big" onClick={() => onAddShared(book)}>
          공동 서재 추가
        </button>
      </div>

      <div className="bs-detail-right">
        <div className="bs-rating-badge">
          <span className="star">★</span>
          <strong>{average.toFixed(1)}</strong>
          <span className="count" title="서재에 추가한 사람 수">({addedCount})</span>
        </div>

        <div className="bs-detail-scroll">
          <header className="bs-detail-head">
            <h1>{book.title}</h1>
            {book.authorLine && <p>{book.authorLine}</p>}
          </header>

          <section>
            <h2>책 소개</h2>
            <p className={`bs-intro ${foldable && !expanded ? "folded" : ""}`}>
              {intro || "등록된 책 소개가 없습니다."}
            </p>
            {foldable && (
              <button type="button" className="bs-link-btn bs-fold" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "접기" : "더보기"}
              </button>
            )}
          </section>

          <section className="bs-others">
            <h2>이 작가의 다른 작품</h2>
            {others === null && <p className="bs-status left">불러오는 중…</p>}
            {others?.length === 0 && <p className="bs-status left">이 작가의 다른 작품이 없어요.</p>}
            {others?.length > 0 && (
              <div className="bs-others-row">
                {others.map((b) => (
                  <button key={b.id} type="button" onClick={() => onOpenOther(b)}>
                    <img src={b.cover} alt={b.title} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bs-reviews">
            <h2>리뷰</h2>
            <div className="bs-my-rating">
              <span>나의 리뷰</span>
              <StarInput value={rating} onChange={setRating} disabled={Boolean(mine)} />
            </div>
            <form
              className="bs-review-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitReview();
              }}
            >
              <input
                type="text"
                value={content}
                maxLength={MAX_REVIEW_LENGTH}
                placeholder="이 책에 대한 한줄평을 남겨주세요."
                aria-label="한줄평"
                readOnly={Boolean(mine) && !editing}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
                }}
              />
              {editing && (
                <>
                  <button type="button" className="bs-review-cancel" onClick={removeReview}>
                    삭제
                  </button>
                  <button type="button" className="bs-review-cancel" onClick={cancelEdit}>
                    취소
                  </button>
                </>
              )}
              <button type="submit">{!mine ? "등록" : editing ? "저장" : "수정"}</button>
            </form>

            <h3 className="bs-others-title">
              다른 사람들의 리뷰 <span>({reviewList.length})</span>
            </h3>
            {reviewList.length === 0 && <p className="bs-status left">아직 리뷰가 없어요.</p>}
            <ul className="bs-review-list">
              {reviewList.map((r) => (
                <li key={r.userKey}>
                  <Avatar size={46} />
                  <div>
                    <div className="bs-review-head">
                      <strong>{r.nickname}</strong>
                      {r.userKey === me.key && <span className="bs-review-mine">내 리뷰</span>}
                    </div>
                    <div className="bs-review-meta">
                      <Stars value={r.rating} size={15} />
                      <time>{formatDate(r.date)}</time>
                    </div>
                    <p>{r.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
};

export default BookDetail;
