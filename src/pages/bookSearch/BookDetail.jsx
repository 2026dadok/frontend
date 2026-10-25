import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchAuthorOtherBooks } from "./bookSearchApi";
import { getAddedCount, getMe, getReviews, saveMyReview, summarizeReviews } from "./bookStore";
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
  const [others, setOthers] = useState(null); // null = 불러오는 중

  // 표지 아래 "제목 | 저자 (옮김 …)" 가 두 줄로 넘어가면 옮김은 빼고 저자만 보여준다
  const captionRef = useRef(null);
  const [plainAuthor, setPlainAuthor] = useState(false);
  useLayoutEffect(() => {
    if (plainAuthor || book.authorLine === book.author) return;
    if (!captionRef.current) return;
    // 글 조각마다 사각형이 따로 잡히므로, 세로 위치가 서로 다른 줄의 수를 센다
    const lineTops = new Set([...captionRef.current.getClientRects()].map((r) => Math.round(r.top / 4)));
    if (lineTops.size > 1) setPlainAuthor(true);
  }, [book, plainAuthor]);
  const captionAuthor = plainAuthor ? book.author : book.authorLine;

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
  const otherReviews = reviews
    .filter((r) => r.userKey !== me.key)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const foldable = book.intro.length > INTRO_FOLD_LENGTH;

  const submitReview = () => {
    if (!rating) {
      showToast("별점을 선택해주세요.");
      return;
    }
    const text = content.trim();
    if (!text) {
      showToast("한줄평을 입력해주세요.");
      return;
    }
    const next = saveMyReview(book.id, { rating, content: text });
    if (!next) {
      showToast("리뷰를 저장하지 못했어요.");
      return;
    }
    setReviews(next);
    showToast(mine ? "리뷰를 수정했어요." : "리뷰가 등록되었어요.");
  };

  return (
    <>
      <div className="bs-detail-left">
        <div className="bs-cover-card">
          <img src={book.cover} alt={book.title} />
          <p>
            <span ref={captionRef}>{book.title}{captionAuthor && ` | ${captionAuthor}`}</span>
          </p>
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
          <section>
            <h2>책 소개</h2>
            <p className={`bs-intro ${foldable && !expanded ? "folded" : ""}`}>
              {book.intro || "등록된 책 소개가 없습니다."}
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
              <StarInput value={rating} onChange={setRating} />
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
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
                }}
              />
              <button type="submit">등록</button>
            </form>

            <h3 className="bs-others-title">
              다른 사람들의 리뷰 <span>({otherReviews.length})</span>
            </h3>
            {otherReviews.length === 0 && <p className="bs-status left">아직 다른 사람의 리뷰가 없어요.</p>}
            <ul className="bs-review-list">
              {otherReviews.map((r) => (
                <li key={r.userKey}>
                  <Avatar size={46} />
                  <div>
                    <div className="bs-review-head">
                      <strong>{r.nickname}</strong>
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
