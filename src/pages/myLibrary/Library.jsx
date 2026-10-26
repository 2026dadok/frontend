import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { fetchTotalXp } from "../home/homeApi";
import { SearchBar, Toast } from "../bookSearch/parts";
import { getMyLibrary, getSharedLibrary, removeFromMyLibrary } from "../bookSearch/bookStore";
import ReadingCalendar from "./ReadingCalendar";
import { fetchReadingLog } from "./libraryApi";
import xpIcon from "../../images/icon-xp.png";
import mascotImg from "../../images/mascot-reading.png";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas, .bs-search, .bs-xp)을 책 검색과 같이 쓴다
import "./Library.css";

const SLOTS_PER_PAGE = 5; // 한 화면에 책 4권 + 마지막의 + 칸
const ALL = "전체";
const TOAST_MS = 2000;

const ICONS = {
  read: <path d="M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8-.5V18c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5V5.5zM12 6v12.5" />,
  write: <path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1zM14 7l3 3" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5" />,
};
const MenuIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const Arrow = ({ direction, hidden, onClick }) => (
  <button
    type="button"
    className={`lib-arrow ${direction}`}
    style={{ visibility: hidden ? "hidden" : "visible" }}
    aria-label={direction === "prev" ? "이전 책" : "다음 책"}
    onClick={onClick}
  >
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === "prev" ? "M20 12H5M11 6l-6 6 6 6" : "M4 12h15M13 6l6 6-6 6"} />
    </svg>
  </button>
);

// 서고: 나의 서재 / 공동 서재(토글) + 독서 달력
const Library = () => {
  const scale = useFitScale();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "shared" ? "shared" : "my";

  const [version, setVersion] = useState(0); // 삭제 후 목록을 다시 읽기 위한 값
  const books = useMemo(
    () => (tab === "my" ? getMyLibrary() : getSharedLibrary()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, version]
  );
  const [category, setCategory] = useState(ALL);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [menuId, setMenuId] = useState(null); // 메뉴가 열린 책
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [totalXp, setTotalXp] = useState(0);
  const toastTimer = useRef(null);
  const rootRef = useRef(null);
  const log = useMemo(() => fetchReadingLog(), []);

  const categories = useMemo(
    () => [ALL, ...new Set(books.map((b) => b.category || "기타"))],
    [books]
  );
  const shown = category === ALL ? books : books.filter((b) => (b.category || "기타") === category);
  const items = [...shown, null]; // null = 맨 끝의 + 칸
  const pageItems = items.slice(page * SLOTS_PER_PAGE, (page + 1) * SLOTS_PER_PAGE);
  const lastPage = Math.max(0, Math.ceil(items.length / SLOTS_PER_PAGE) - 1);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(fetchTotalXp)
      .then((v) => alive && v != null && setTotalXp(v))
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // 메뉴/드롭다운 밖을 누르거나 Esc 를 누르면 닫는다
  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) return;
      if (!e.target.closest(".lib-book-wrap, .lib-category")) {
        setMenuId(null);
        setCategoryOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuId(null);
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  }, []);

  const switchTab = (next) => {
    setParams({ tab: next }, { replace: true });
    setCategory(ALL);
    setCategoryOpen(false);
    setPage(0);
    setMenuId(null);
  };

  const pickCategory = (value) => {
    setCategory(value);
    setCategoryOpen(false);
    setPage(0);
    setMenuId(null);
  };

  const goSearch = () => {
    const word = query.trim();
    if (!word) {
      showToast("검색어를 입력해주세요.");
      return;
    }
    navigate(PATHS.search, { state: { query: word } });
  };

  // TODO: 타이머/감상문 페이지가 만들어지면 해당 페이지에서 state.book 을 받아 쓴다
  const readNow = (book) => navigate(PATHS.timer, { state: { book } });
  const writeReview = (book) => navigate(PATHS.review, { state: { book } });

  const deleteBook = async (book) => {
    setMenuId(null);
    if (!window.confirm(`'${book.title}'을(를) 나의 서재에서 삭제할까요?`)) return;
    const result = await removeFromMyLibrary(book.id);
    if (result === "removed") {
      setVersion((v) => v + 1);
      setPage(0);
      showToast("삭제했어요.");
    } else {
      showToast("삭제하지 못했어요.");
    }
  };

  const title = tab === "my" ? "나의 서재" : "공동 서재";

  return (
    <div className="bs" ref={rootRef}>
      <div className="bs-xp">
        <i style={{ maskImage: `url(${xpIcon})`, WebkitMaskImage: `url(${xpIcon})` }} aria-hidden="true" />
        <span>{totalXp}</span>
      </div>

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          <SearchBar value={query} onChange={setQuery} onSubmit={goSearch} />

          <section className="lib-card lib-shelf">
            <div className="lib-head">
              <button
                type="button"
                className={`lib-toggle ${tab}`}
                role="switch"
                aria-checked={tab === "shared"}
                aria-label="나의 서재와 공동 서재 전환"
                onClick={() => switchTab(tab === "my" ? "shared" : "my")}
              >
                <span />
              </button>
              <h2>{title}</h2>
              <div className="lib-category">
                <button type="button" className="lib-category-btn" aria-haspopup="listbox" aria-expanded={categoryOpen} onClick={() => setCategoryOpen((v) => !v)}>
                  {category}
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 11l3.5 3.5 3.5-3.5" />
                  </svg>
                </button>
                {categoryOpen && (
                  <ul className="lib-category-list" role="listbox">
                    {categories.map((c) => (
                      <li key={c}>
                        <button type="button" role="option" aria-selected={c === category} onClick={() => pickCategory(c)}>
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lib-row">
              <Arrow direction="prev" hidden={page === 0} onClick={() => { setPage((p) => p - 1); setMenuId(null); }} />
              <div className="lib-books">
                {pageItems.map((book, i) =>
                  book ? (
                    <div key={`${book.id}-${book.friendId ?? ""}`} className={`lib-book-wrap ${i >= 3 ? "flip" : ""}`}>
                      <button
                        type="button"
                        className={`lib-book ${menuId === book.id ? "selected" : ""}`}
                        aria-haspopup="menu"
                        aria-expanded={menuId === book.id}
                        onClick={() => setMenuId(menuId === book.id ? null : book.id)}
                      >
                        <img src={book.cover} alt={book.title} />
                        {book.completed && <span className="lib-badge">완독</span>}
                      </button>
                      {menuId === book.id && (
                        <div className="lib-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => readNow(book)}>
                            <MenuIcon name="read" /> 바로 읽기
                          </button>
                          <button type="button" role="menuitem" onClick={() => writeReview(book)}>
                            <MenuIcon name="write" /> 감상문 쓰기
                          </button>
                          {tab === "my" && (
                            <button type="button" role="menuitem" onClick={() => deleteBook(book)}>
                              <MenuIcon name="trash" /> 삭제
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link key="add" to={PATHS.search} className="lib-add" aria-label={`${title}에 책 추가 (책 검색으로 이동)`}>
                      <span>+</span>
                    </Link>
                  )
                )}
              </div>
              <Arrow direction="next" hidden={page >= lastPage} onClick={() => { setPage((p) => p + 1); setMenuId(null); }} />
            </div>
          </section>

          <section className="lib-card lib-cal-card" aria-label="독서 달력">
            <ReadingCalendar year={new Date().getFullYear()} log={log} />
          </section>

          <img className="lib-mascot" src={mascotImg} alt="" />
          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
};

export default Library;
