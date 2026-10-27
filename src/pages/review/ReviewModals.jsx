import { useEffect, useState } from "react";
import { formatDate } from "./format";

const MAX_LENGTH = 300; // 명세서: 감상문 300자 이하

// Esc 를 누르면 닫는다
const useEscape = (onClose) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
};

// 팝업 안쪽 오른쪽 위의 회색 동그란 닫기 버튼 (마우스를 올리면 빨간색)
const CloseButton = ({ onClick }) => (
  <button type="button" className="review-modal-close" aria-label="닫기" onClick={onClick}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  </button>
);

const Overlay = ({ scale, onClose, children, label }) => (
  <div className="review-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="review-modal" style={{ "--s": scale }} role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>
  </div>
);

const Arrow = ({ side, onClick }) => (
  <button type="button" className={`review-modal-arrow ${side}`} aria-label={side === "next" ? "다음 감상문" : "이전 감상문"} onClick={onClick}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={side === "next" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
    </svg>
  </button>
);

// 일차 카드를 누르면 나오는 감상문 전체 보기. 좌우 화살표로 다른 일차의 감상문으로 넘어간다.
export const CommentaryDetailModal = ({ scale, label, entry, onPrev, onNext, onClose }) => {
  useEscape(onClose);
  return (
    <Overlay scale={scale} onClose={onClose} label={`${label} 감상문`}>
      <div className="review-modal-card">
        <header>
          <h2>{label}</h2>
          <CloseButton onClick={onClose} />
        </header>
        <div className="review-modal-text">{entry.content}</div>
        <time>{formatDate(entry.date)}</time>
      </div>
      {onPrev && <Arrow side="prev" onClick={onPrev} />}
      {onNext && <Arrow side="next" onClick={onNext} />}
    </Overlay>
  );
};

// 감상문 쓰기. [오늘은 넘기기] 는 쓰지 않고 닫고, [완료] 는 저장한다.
export const CommentaryWriteModal = ({ scale, book, day, saving, onSubmit, onClose }) => {
  const [content, setContent] = useState("");
  useEscape(onClose);
  const text = content.trim();

  return (
    <Overlay scale={scale} onClose={onClose} label="감상문 쓰기">
      <form
        className="review-modal-card write"
        onSubmit={(e) => {
          e.preventDefault();
          if (text && !saving) onSubmit(text);
        }}
      >
        <header>
          <h2>이 책의 감상문 쓰기 | {day}일차</h2>
          <CloseButton onClick={onClose} />
        </header>

        <div className="review-write-body">
          <div className="review-write-book">
            <img src={book.cover} alt={book.title} />
            <div>
              <strong>{book.title}</strong>
              {book.author && <p>{book.author}</p>}
            </div>
          </div>

          <label className="review-write-field">
            <textarea
              autoFocus
              value={content}
              maxLength={MAX_LENGTH}
              placeholder="자유롭게 책을 읽었을 때 느낀 모든 것을 자유롭게 적어보세요!"
              aria-label="감상문"
              onChange={(e) => setContent(e.target.value)}
            />
            <span className="review-write-count">{content.length} / {MAX_LENGTH}자</span>
          </label>
        </div>

        <footer>
          <button type="button" className="skip" onClick={onClose}>
            오늘은 넘기기
          </button>
          <button type="submit" className="done" disabled={!text || saving}>
            완료
          </button>
        </footer>
      </form>
    </Overlay>
  );
};
