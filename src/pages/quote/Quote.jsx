import { useEffect, useMemo, useState } from "react";
import useFitScale from "../../hooks/useFitScale";
import useToast from "../../hooks/useToast";
import { isLoggedIn } from "../../api/client";
import { getMyLibrary } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import { QuoteAddModal, QuoteDetailModal, QuoteEditModal } from "./QuoteModals";
import { addQuote, formatShort, getQuotes, removeQuote, toggleFavorite, updateQuote } from "./quoteStore";
import "../bookSearch/BookSearch.css"; // 알림창(.bs-toast)과 오른쪽 위 XP(.bs-xp) 모양을 같이 쓴다
import "./Quote.css";

const SORTS = [
  { value: "latest", label: "최신순" }, // 나중에 쓴 인용구가 위
  { value: "date", label: "날짜순" }, // 날짜가 오래된 인용구가 위
];

const sortQuotes = (list, sort) =>
  [...list].sort((a, b) =>
    sort === "date" ? new Date(a.date) - new Date(b.date) : new Date(b.createdAt) - new Date(a.createdAt)
  );

// 인용구 한 줄. 마우스를 올리면 초록 테두리와 ••• (즐겨찾기 / 수정 / 삭제)가 나온다.
const QuoteRow = ({ quote, menuOpen, onOpen, onToggleMenu, onFavorite, onEdit, onDelete }) => (
  <article
    className={`quote-row ${menuOpen ? "active" : ""}`}
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={(e) => e.target === e.currentTarget && e.key === "Enter" && onOpen()}
  >
    <div className="quote-row-band" />
    <p className="quote-row-text">
      <span>{quote.text.replace(/\n/g, " ")}</span>
    </p>
    <p className="quote-row-meta">
      <strong>{quote.book}</strong>
      {quote.page ? <span>{quote.page}p</span> : null}
      <span>{formatShort(quote.date)}</span>
    </p>
    <button
      type="button"
      className="quote-row-more"
      aria-label="더보기"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      onClick={(e) => {
        e.stopPropagation();
        onToggleMenu();
      }}
    >
      <i /><i /><i />
    </button>
    {menuOpen && (
      <div className="quote-row-menu" role="menu" onClick={(e) => e.stopPropagation()}>
        <button type="button" role="menuitem" onClick={onFavorite}>
          {quote.favorite ? "즐겨찾기 해제" : "즐겨찾기"}
        </button>
        <button type="button" role="menuitem" onClick={onEdit}>
          수정
        </button>
        <button type="button" role="menuitem" onClick={onDelete}>
          삭제
        </button>
      </div>
    )}
  </article>
);

// 나의 인용구 노트: 인용구 목록 + 보기 / 수정 / 추가 팝업
const Quote = () => {
  const scale = useFitScale({ fitHeight: false }); // 위아래로 스크롤되는 페이지라 가로 폭만 맞춘다

  const [version, setVersion] = useState(0); // 저장·삭제 뒤 목록을 다시 읽기 위한 값
  const [sort, setSort] = useState("latest");
  const [menuId, setMenuId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();

  const quotes = useMemo(
    () => sortQuotes(getQuotes(), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sort, version]
  );
  const books = useMemo(
    () => getMyLibrary(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );
  const byId = (id) => quotes.find((q) => q.id === id) ?? null;

  // ••• 메뉴 밖을 누르거나 Esc 를 누르면 닫는다
  useEffect(() => {
    const onDown = (e) => {
      if (!e.target.closest?.(".quote-row-menu, .quote-row-more")) setMenuId(null);
    };
    const onKey = (e) => e.key === "Escape" && setMenuId(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 인용구 추가는 로그인해야 할 수 있다
  const openAdd = () => {
    if (!isLoggedIn()) {
      showToast("로그인이 필요해요.");
      return;
    }
    setAdding(true);
  };

  const handleFavorite = (quote) => {
    setMenuId(null);
    const next = toggleFavorite(quote.id);
    setVersion((v) => v + 1);
    showToast(next ? "즐겨찾기에 추가했어요." : "즐겨찾기를 해제했어요.");
  };

  const handleDelete = async (quote) => {
    setMenuId(null);
    if (!window.confirm("이 인용구를 삭제할까요?")) return;
    const result = await removeQuote(quote.id); // 서버가 삭제를 받아줘야 지워진다
    if (result === "removed") {
      setVersion((v) => v + 1);
      showToast("삭제했어요.");
    } else {
      showToast("삭제하지 못했어요.");
    }
  };

  const handleEdit = (quote) => {
    setMenuId(null);
    setEditId(quote.id);
  };

  const submitEdit = async (text) => {
    setSaving(true);
    const result = await updateQuote(editId, text);
    setSaving(false);
    if (result !== "saved") {
      showToast("인용구를 수정하지 못했어요.");
      return;
    }
    setEditId(null);
    setVersion((v) => v + 1);
    showToast("인용구를 수정했어요.");
  };

  const submitAdd = async ({ book, page, text }) => {
    setSaving(true);
    const result = await addQuote({ book, page, text });
    setSaving(false);
    if (result !== "saved") {
      showToast("인용구를 저장하지 못했어요.");
      return;
    }
    setAdding(false);
    setVersion((v) => v + 1);
    showToast("인용구를 저장했어요.");
  };

  const detail = byId(detailId);
  const editing = byId(editId);

  return (
    <div className="quote-page">
      <div className="quote-xp">
        <XpTotal />
      </div>

      <div className="quote-stage" style={{ "--s": scale }}>
        <div className="quote-canvas">
          <h1>나의 인용구 노트</h1>

          <div className="quote-sorts" role="group" aria-label="정렬">
            {SORTS.map((s) => (
              <button key={s.value} type="button" className={sort === s.value ? "on" : ""} aria-pressed={sort === s.value} onClick={() => setSort(s.value)}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="quote-list">
            {quotes.map((q) => (
              <QuoteRow
                key={q.id}
                quote={q}
                menuOpen={menuId === q.id}
                onOpen={() => setDetailId(q.id)}
                onToggleMenu={() => setMenuId(menuId === q.id ? null : q.id)}
                onFavorite={() => handleFavorite(q)}
                onEdit={() => handleEdit(q)}
                onDelete={() => handleDelete(q)}
              />
            ))}

            <button type="button" className="quote-add" aria-label="인용구 추가" onClick={openAdd}>
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {detail && <QuoteDetailModal scale={scale} quote={detail} onClose={() => setDetailId(null)} />}
      {editing && <QuoteEditModal scale={scale} quote={editing} saving={saving} onSubmit={submitEdit} onClose={() => setEditId(null)} />}
      {adding && <QuoteAddModal scale={scale} books={books} saving={saving} onSubmit={submitAdd} onClose={() => setAdding(false)} />}

      <Toast message={toast} />
    </div>
  );
};

export default Quote;
