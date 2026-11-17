import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "../../routes";
import { isLoggedIn } from "../../api/client";
import { fetchGenreBooks, searchBooks } from "./bookSearchApi";
import { addToMyLibrary, findInMyLibrary, getMe, requestCoReading, syncMyLibrary, syncSharedLibrary } from "./bookStore";
import usePagedBooks from "./usePagedBooks";
import { SearchBar, Toast, XpTotal } from "./parts";
import BookList from "./BookList";
import SearchResults from "./SearchResults";
import BookDetail from "./BookDetail";
import CoInvite from "./CoInvite";
import useFitScale from "../../hooks/useFitScale";
import useToast from "../../hooks/useToast";
import backIcon from "../../images/back.png";
import "./BookSearch.css";

const START_TOAST_MS = 2500;

const EMPTY_PAGE = { books: [], total: 0 };

// 화면 흐름: list(1) → results(2) / detail(3·4) → invite(5·6). 공동서재(7)는 서고의 공동 서재 탭에서 본다
// 지금 화면은 useState 가 아니라 주소에 둔다. 그래서 새로고침해도 보던 화면이 그대로고, 뒤로 가기를 누르면 이전 화면으로 돌아간다.
//   /search                  → 1번 (장르 목록, ?genre= 로 고른 장르)
//   /search?q=검색어          → 2번 (검색 결과)
//   /search?view=detail      → 3·4번 (책 상세)    ※ 고른 책은 주소가 아니라 방문 기록(location.state.book)에 담는다
//   /search?view=invite      → 5·6번 (함께 읽기 초대)
// 다른 화면에서 책 상세로 바로 오려면: navigate(`${PATHS.search}?view=detail`, { state: { book } })
const BOOK_VIEWS = ["detail", "invite"]; // 고른 책이 있어야 열리는 화면

const BookSearch = () => {
  const scale = useFitScale();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const term = params.get("q") ?? ""; // 마지막으로 검색한 단어
  const genre = params.get("genre") ?? "bestseller"; // 1번 화면에서 고른 장르
  const book = location.state?.book ?? null; // 선택한 책
  const asked = params.get("view");
  // 책 없이 상세 주소만 열렸으면(주소를 직접 친 경우 등) 책이 필요 없는 화면을 보여준다
  const view = BOOK_VIEWS.includes(asked) && book ? asked : term ? "results" : "list";

  const [query, setQuery] = useState(term); // 검색창에 적힌 글자
  // 뒤로 가기 등으로 주소의 검색어가 바뀌면 검색창 글자도 맞춘다
  const [shownTerm, setShownTerm] = useState(term);
  if (shownTerm !== term) {
    setShownTerm(term);
    setQuery(term);
  }
  // 나의 서재를 서버에서 받아 둔다 (이미 담은 책인지, 바로 읽기에 넘길 서버 책 번호를 알기 위해)
  useEffect(() => {
    syncMyLibrary();
  }, []);

  const [starting, setStarting] = useState(false);
  const [toast, showToast] = useToast();

  // 주소의 값 일부만 바꿔서 이동한다. replace 면 방문 기록을 쌓지 않는다.
  const go = (changes, { book: nextBook = book, replace = false } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace, state: nextBook ? { book: nextBook } : null });
  };
  const setGenre = (g) => go({ genre: g === "bestseller" ? null : g, view: null }, { book: null, replace: true }); // 장르는 기록 없이 바꾼다
  const genreLoader = useCallback((page) => fetchGenreBooks(genre, page), [genre]);
  const bestsellers = usePagedBooks(genreLoader);
  const searchLoader = useCallback(
    (page) => (term ? searchBooks(term, page) : Promise.resolve(EMPTY_PAGE)),
    [term]
  );
  const results = usePagedBooks(searchLoader);

  // 같은 검색어면 다시 불러오지 않고 결과 화면으로 돌아간다. 다른 검색어면 새로 검색한다.
  const handleSearch = () => {
    const next = query.trim();
    if (!next) {
      showToast("검색어를 입력해주세요.");
      return;
    }
    go({ q: next, view: null }, { book: null, replace: view === "results" && next === term });
  };

  // 뒤로 가기 (모든 화면 왼쪽 위). 앞 화면이 있으면 그리로(홈 추천 도서 → 홈, 상세 → 검색 결과 등).
  // 앞 화면이 없으면(새로고침·주소 직접 입력) 목록 화면은 홈으로, 나머지 화면은 책 검색 목록으로
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else if (view === "list") navigate(PATHS.main);
    else go({ q: null, view: null }, { book: null, replace: true });
  };

  const openBook = (b) => {
    go({ view: "detail" }, { book: b });
  };

  const addMine = async (b) => {
    const result = await addToMyLibrary(b);
    if (result === "added") showToast("나의 서재에 추가되었어요.");
    else if (result === "exists") showToast("이미 나의 서재에 있는 책이에요.");
    else if (result === "login") showToast("로그인이 필요해요.");
    else showToast("저장하지 못했어요.");
  };

  const openInvite = (b) => {
    // 함께 읽기는 친구 아이디를 입력하기 전에 막는다 (입력하고 나서야 안 된다고 하면 헛수고라서)
    if (!isLoggedIn()) {
      showToast("로그인이 필요해요.");
      return;
    }
    go({ view: "invite" }, { book: b });
  };

  // 친구는 실제 사용자여야 한다. 백엔드(POST /shared-readings)는 수락 단계 없이 바로 함께 읽기를 시작한다.
  // 성공하면 공동서재 목록을 다시 받아 둔다 (서고의 공동 서재 탭에 바로 보이게).
  const startTogether = async ({ id, name }) => {
    if (id === getMe().key) {
      showToast("자기 자신과는 함께 읽을 수 없어요.");
      return;
    }
    setStarting(true);
    const sent = await requestCoReading(id, name, { ...book, ...findInMyLibrary(book) });
    setStarting(false);
    if (!sent) {
      showToast("함께 읽기를 요청하지 못했어요. 아이디를 확인해주세요.");
      return;
    }
    syncSharedLibrary();
    showToast("공동 서재에 추가했어요.", START_TOAST_MS);
    go({ view: "detail" }, { replace: true }); // 초대 화면을 상세로 바꾼다 (뒤로 가기로 초대 화면에 다시 오지 않게)
  };

  // 타이머로 간다. 서재에 담아 둔 책이면 서버 번호(serverBookId)를 같이 넘겨서 읽은 기록이 서버에 저장되게 한다.
  const readNow = (b) => {
    if (!isLoggedIn()) {
      showToast("로그인이 필요해요.");
      return;
    }
    const shelf = findInMyLibrary(b);
    navigate(PATHS.timer, { state: { book: { ...b, totalPage: b.pages, ...shelf } } });
  };

  const showSearchBar = view === "list" || view === "results" || view === "detail";

  return (
    <div className="bs">
      <XpTotal />

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          <button type="button" className="bs-back" aria-label="뒤로 가기" onClick={goBack}>
            <img src={backIcon} alt="" />
          </button>
          {showSearchBar && <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />}

          {view === "list" && <BookList list={bestsellers} genre={genre} onGenreChange={setGenre} onOpen={openBook} />}
          {view === "results" && (
            <SearchResults
              results={results}
              onOpen={openBook}
              onAddMine={addMine}
              onAddShared={openInvite}
            />
          )}
          {view === "detail" && book && (
            <BookDetail
              key={book.id}
              book={book}
              onReadNow={readNow}
              onAddMine={addMine}
              onAddShared={openInvite}
              onOpenOther={openBook}
              showToast={showToast}
            />
          )}
          {view === "invite" && book && (
            <CoInvite book={book} busy={starting} onSubmit={startTogether} showToast={showToast} />
          )}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
};

export default BookSearch;
