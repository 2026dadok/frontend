import { useLayoutEffect, useRef, useState } from "react";
import useEscape from "../../hooks/useEscape";
import { MAX_QUOTE_LENGTH, formatFull } from "./quoteStore";

// 어두운 배경 + 가운데 팝업. 배경을 누르면 닫힌다. (팝업 크기는 화면 배율(scale)에 맞춰 같이 줄어든다)
const Frame = ({ scale, onClose, label, children }) => (
  <div className="quote-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="quote-modal" style={{ "--s": scale }} role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>
  </div>
);

// 글이 늘어나면 높이도 늘어나는 입력칸. 한 줄일 때도 높이가 글에 딱 맞아서 문장 영역의 가운데에 놓인다.
const AutoTextarea = ({ value, ...props }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} {...props} />;
};

// 큰 따옴표 문장 영역 (보기 / 수정 / 추가가 같은 모양을 쓴다)
const QuoteBody = ({ children }) => (
  <div className="quote-modal-body">
    {/* 따옴표는 글 영역(inner) 기준으로 놓아서, 글이 길어 스크롤돼도 글의 시작·끝을 따라간다 */}
    <div className="inner">
      <span className="mark open" aria-hidden="true">“</span>
      <div className="text">{children}</div>
      <span className="mark close" aria-hidden="true">”</span>
    </div>
  </div>
);

// 인용구 하나를 크게 보여준다.
export const QuoteDetailModal = ({ scale, quote, onClose }) => {
  useEscape(onClose);
  return (
    <Frame scale={scale} onClose={onClose} label="인용구">
      <header>{formatFull(quote.date)}</header>
      <QuoteBody>
        <p>{quote.text}</p>
      </QuoteBody>
      <footer>
        &lt; {quote.book}
        {quote.page ? ` | ${quote.page}쪽` : ""} &gt;
      </footer>
    </Frame>
  );
};

// 취소 / 완료 버튼 줄
const Actions = ({ saving, canSubmit, onCancel }) => (
  <div className="quote-modal-actions">
    <button type="button" onClick={onCancel}>
      취소
    </button>
    <button type="submit" className="done" disabled={!canSubmit || saving}>
      완료
    </button>
  </div>
);

// 인용구 문장을 고친다. 서버가 받아줘야 바뀐다. (저장 처리는 부모가 한다)
export const QuoteEditModal = ({ scale, quote, saving, onSubmit, onClose }) => {
  const [text, setText] = useState(quote.text);
  useEscape(onClose);
  const trimmed = text.trim();
  return (
    <Frame scale={scale} onClose={onClose} label="인용구 수정">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed && !saving) onSubmit(trimmed);
        }}
      >
        <header>{formatFull(quote.date)}</header>
        <QuoteBody>
          <AutoTextarea
            autoFocus
            value={text}
            maxLength={MAX_QUOTE_LENGTH}
            aria-label="인용구"
            onChange={(e) => setText(e.target.value)}
          />
        </QuoteBody>
        <footer className="with-actions">
          <span>
            &lt; {quote.book}
            {quote.page ? ` | ${quote.page}쪽` : ""} &gt;
          </span>
          <Actions saving={saving} canSubmit={Boolean(trimmed) && trimmed !== quote.text} onCancel={onClose} />
        </footer>
      </form>
    </Frame>
  );
};

// 인용구를 새로 쓴다. 날짜는 오늘, 어느 책의 몇 쪽인지 고른다.
export const QuoteAddModal = ({ scale, books, saving, onSubmit, onClose }) => {
  const [text, setText] = useState("");
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [page, setPage] = useState("");
  useEscape(onClose);
  const trimmed = text.trim();
  const book = books.find((b) => b.id === bookId);

  return (
    <Frame scale={scale} onClose={onClose} label="인용구 쓰기">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed && book && !saving) onSubmit({ book, page: Number(page) || null, text: trimmed });
        }}
      >
        <header>{formatFull(new Date().toISOString())}</header>
        <QuoteBody>
          <AutoTextarea
            autoFocus
            value={text}
            maxLength={MAX_QUOTE_LENGTH}
            placeholder="인상깊은 문구를 적어보세요"
            aria-label="인용구"
            onChange={(e) => setText(e.target.value)}
          />
        </QuoteBody>
        <footer className="with-actions">
          <span className="pick">
            &lt;
            {books.length ? (
              <select value={bookId} aria-label="책" onChange={(e) => setBookId(e.target.value)}>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            ) : (
              <em>서재에 책이 없어요</em>
            )}
            |
            <input
              type="number"
              min="1"
              max={book?.totalPage || undefined}
              value={page}
              placeholder="쪽"
              aria-label="쪽수"
              onChange={(e) => setPage(e.target.value)}
            />
            쪽 &gt;
          </span>
          <Actions saving={saving} canSubmit={Boolean(trimmed) && Boolean(book)} onCancel={onClose} />
        </footer>
      </form>
    </Frame>
  );
};
