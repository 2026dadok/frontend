import { useEffect, useMemo, useRef, useState } from "react";
import CompleteBadge from "../../components/CompleteBadge";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "../../routes";
import { getSidebarWidth } from "../../hooks/uiScale";
import useFitScale from "../../hooks/useFitScale";
import useToast from "../../hooks/useToast";
import { SearchBar, Toast, XpTotal } from "../bookSearch/parts";
import { getMyLibrary, getSharedLibrary, removeFromMyLibrary, syncMyLibrary, syncSharedLibrary } from "../bookSearch/bookStore";
import ReadingCalendar from "./ReadingCalendar";
import { fetchReadingLog } from "./libraryApi";
import moleImg from "../../images/dokddage.png";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas, .bs-search, .bs-xp)을 책 검색과 같이 쓴다
import "./Library.css";

// 디자인 기준(가로 1419)에서는 한 화면에 책 4권 + 마지막의 + 칸 = 5칸. 창이 넓으면 카드가 늘어나서 더 많이 들어간다.
const DESIGN_CANVAS_W = 1419;
const SHELF_LEFT = 109;
const SHELF_RIGHT = 112;
const SHELF_SIDE_SPACE = 16 + 41 + 36 + 41 + 22; // 서재 카드 안 양쪽의 화살표·여백
const BOOK_W = 169;
const BOOK_GAP = 37;
const MAX_MOLE_RATIO = 1.5;
const ALL = "전체";

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

// 창 너비가 바뀔 때마다 다시 그리기 위한 값
const useWindowWidth = () => {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
};

// 서고: 나의 서재 / 공동 서재(토글) + 독서 달력
const Library = () => {
  const scale = useFitScale();
  // 화면 틀(디자인 px 기준 너비). 창이 넓으면 1419보다 커져서 카드·달력이 가로로 늘어난다.
  const canvasW = Math.max(DESIGN_CANVAS_W, (useWindowWidth() - getSidebarWidth()) / scale);
  const booksAreaW = canvasW - SHELF_LEFT - SHELF_RIGHT - SHELF_SIDE_SPACE;
  const slotsPerPage = Math.max(1, Math.floor((booksAreaW + BOOK_GAP) / (BOOK_W + BOOK_GAP)));
  const moleRatio = Math.min(MAX_MOLE_RATIO, canvasW / DESIGN_CANVAS_W);
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
  const [toast, showToast] = useToast();
  const rootRef = useRef(null);
  const [log, setLog] = useState({});

  // 서버의 서재·공동서재 목록과 달력 기록을 받아 온다 (받기 전에는 브라우저 사본으로 그린다)
  useEffect(() => {
    let alive = true;
    Promise.all([syncMyLibrary(), syncSharedLibrary()]).then(() => alive && setVersion((v) => v + 1));
    fetchReadingLog().then((value) => alive && setLog(value));
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => [ALL, ...new Set(books.map((b) => b.category || "기타"))],
    [books]
  );
  const shown = category === ALL ? books : books.filter((b) => (b.category || "기타") === category);
  const items = [...shown, null]; // null = 맨 끝의 + 칸
  const lastPage = Math.max(0, Math.ceil(items.length / slotsPerPage) - 1);
  const currentPage = Math.min(page, lastPage); // 창이 넓어져 한 화면에 더 들어가면 마지막 쪽을 넘지 않게
  const pageItems = items.slice(currentPage * slotsPerPage, (currentPage + 1) * slotsPerPage);

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
    navigate(`${PATHS.search}?q=${encodeURIComponent(word)}`);
  };

  // 책을 누르면 옆에 메뉴가 열린다. 나의 서재: 바로 읽기 / 감상문 쓰기 / 삭제, 공동 서재: 바로 읽기 / 감상문 쓰기 (삭제 없음)
  // 공동 서재는 같은 책을 친구별로 따로 담을 수 있어서 책 id 와 친구 id 를 합쳐 메뉴를 구분한다.
  const menuKey = (book) => `${book.id}-${book.friendId ?? ""}`;
  const openBook = (book) => setMenuId(menuId === menuKey(book) ? null : menuKey(book));
  const readNow = (book) => navigate(PATHS.timer, { state: { book } });
  const writeReview = (book) => navigate(`${PATHS.review}?write=1`, { state: { book } });

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
    <div className="bs lib-page" ref={rootRef}>
      <XpTotal />

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas" style={{ width: canvasW, "--mole": moleRatio }}>
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
              <Arrow direction="prev" hidden={currentPage === 0} onClick={() => { setPage((p) => p - 1); setMenuId(null); }} />
              <div className="lib-books">
                {pageItems.map((book, i) =>
                  book ? (
                    <div key={`${book.id}-${book.friendId ?? ""}`} className={`lib-book-wrap ${i >= 3 ? "flip" : ""}`}>
                      <button
                        type="button"
                        className={`lib-book ${menuId === menuKey(book) ? "selected" : ""}`}
                        aria-haspopup="menu"
                        aria-expanded={menuId === menuKey(book)}
                        onClick={() => openBook(book)}
                      >
                        <img src={book.cover} alt={book.title} />
                        {book.completed && <CompleteBadge className="lib-badge" />}
                      </button>
                      {menuId === menuKey(book) && (
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
              <Arrow direction="next" hidden={currentPage >= lastPage} onClick={() => { setPage((p) => p + 1); setMenuId(null); }} />
            </div>
          </section>

          <section className="lib-card lib-cal-card" aria-label="독서 달력">
            <ReadingCalendar year={new Date().getFullYear()} log={log} />
          </section>

          <img className="lib-mole" src={moleImg} alt="" />
          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
};

export default Library;
