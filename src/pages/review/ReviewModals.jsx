import { useState } from "react";
import useEscape from "../../hooks/useEscape";
import { formatDate } from "./format";
import { draftFor, pageRangeOf, saveDraft } from "./reviewExtras";

// 감상문 최대 글자 수 (피그마 시안). TODO: 백엔드는 새 감상문을 아직 300자까지만 받는다 (FeelingCreateRequest, CreateReflectionRequest). 고치기는 1000자
export const MAX_LENGTH = 1000;

// 팝업 안쪽 오른쪽 위의 닫기(×) 버튼. plain: 동그라미 없이 연한 × (감상문 전체 보기, 피그마)
const CloseButton = ({ onClick, plain = false }) => (
  <button type="button" className={`review-modal-close ${plain ? "plain" : ""}`} aria-label="닫기" onClick={onClick}>
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
//   위: 일차(/ 완독), 그 아래 읽은 쪽수, 오른쪽 위 닫기(×)
//   아래: 왼쪽 날짜, 오른쪽 [수정] (내 감상문이고 고칠 수 있을 때만. onSave 가 없으면 버튼이 없다)
export const CommentaryDetailModal = ({ scale, label, entry, range, saving, onSave, onPrev, onNext, onClose }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  useEscape(onClose);
  const text = content.trim();

  // 다른 일차로 넘어가면 고치던 것은 접는다
  const [shownEntry, setShownEntry] = useState(entry);
  if (shownEntry !== entry) {
    setShownEntry(entry);
    setEditing(false);
    setContent(entry.content);
  }

  const save = async () => {
    if (!text || saving) return;
    if (text === entry.content) {
      setEditing(false);
      return;
    }
    if (await onSave(text)) setEditing(false);
  };

  return (
    <Overlay scale={scale} onClose={onClose} label={`${label} 감상문`}>
      <div className="review-modal-card detail">
        <header>
          <h2>{label}</h2>
          {range && <p className="review-modal-range">{range}</p>}
          <CloseButton plain onClick={onClose} />
        </header>
        {editing ? (
          <label className="review-write-field edit">
            <textarea
              autoFocus
              value={content}
              maxLength={MAX_LENGTH}
              aria-label="감상문 고치기"
              onChange={(e) => setContent(e.target.value)}
            />
            <span className="review-write-count">{content.length} / {MAX_LENGTH}자</span>
          </label>
        ) : (
          <div className="review-modal-text">{entry.content}</div>
        )}
        <footer className="review-modal-foot">
          <time>{formatDate(entry.date)}</time>
          {onSave &&
            (editing ? (
              <div>
                <button type="button" className="skip" onClick={() => { setEditing(false); setContent(entry.content); }}>
                  취소
                </button>
                <button type="button" className="done" disabled={!text || saving} onClick={save}>
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            ) : (
              <button type="button" className="review-modal-edit" onClick={() => setEditing(true)}>
                수정
              </button>
            ))}
        </footer>
      </div>
      {!editing && onPrev && <Arrow side="prev" onClick={onPrev} />}
      {!editing && onNext && <Arrow side="next" onClick={onNext} />}
    </Overlay>
  );
};

// 감상문 쓰기. [오늘은 넘기기] 는 쓰지 않고 닫고, [완료] 는 저장한다.
// 쓰는 중인 글은 그때그때 남겨 둔다 → 저장하지 않고 나가면 홈 말풍선에서 이어 쓸 수 있다 (reviewExtras.saveDraft)
export const CommentaryWriteModal = ({ scale, book, day, saving, onSubmit, onClose }) => {
  const [content, setContent] = useState(() => draftFor(book, day));
  const range = pageRangeOf(book);
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
          {range && <span className="review-modal-pages">{range}</span>}
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
              onChange={(e) => {
                setContent(e.target.value);
                saveDraft(book, day, e.target.value);
              }}
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
