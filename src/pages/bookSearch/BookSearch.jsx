import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchTotalXp } from "../home/homeApi";
import { fetchBestsellers, searchBooks } from "./bookSearchApi";
import { addToMyLibrary, getMe, requestCoReading } from "./bookStore";
import useInfiniteBooks from "./useInfiniteBooks";
import { SearchBar, Toast } from "./parts";
import BookList from "./BookList";
import SearchResults from "./SearchResults";
import BookDetail from "./BookDetail";
import CoInvite from "./CoInvite";
import SharedLibrary from "./SharedLibrary";
import xpIcon from "../../images/icon-xp.png";
import "./BookSearch.css";

// 디자인 기준 크기(사이드바 제외). 창이 이보다 작으면 전체를 비율로 줄여 한 화면에 맞춘다. (홈과 동일)
const DESIGN_W = 1419;
const DESIGN_H = 967;
const SIDEBAR_W = 103;
const TOAST_MS = 2000;
const START_TOAST_MS = 1500;

const EMPTY_PAGE = { books: [], total: 0, hasMore: false };

const useFitScale = () => {
  const calc = () =>
    Math.min(1, window.innerHeight / DESIGN_H, (window.innerWidth - SIDEBAR_W) / DESIGN_W);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
};

// 화면 흐름(페이지 라우팅 없이 state 로 전환):
//   list(1) → results(2) / detail(3·4) → invite(5·6) → shared(7)
const BookSearchFlow = ({ initialBook }) => {
  const scale = useFitScale();
  const [view, setView] = useState(initialBook ? "detail" : "list"); // 홈 추천 도서에서 오면 상세부터
  const [query, setQuery] = useState(""); // 검색창에 적힌 글자
  const [term, setTerm] = useState(""); // 마지막으로 검색한 단어
  const [book, setBook] = useState(initialBook); // 선택한 책
  const [friend] = useState(null); // 수락된 함께 읽기 기록 (수락 확인 API 연결 후 setFriend 로 채운다)
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState("");
  const [totalXp, setTotalXp] = useState(0);
  const toastTimer = useRef(null);
  const flowTimer = useRef(null);

  const bestsellers = useInfiniteBooks(fetchBestsellers);
  const searchLoader = useCallback(
    (page) => (term ? searchBooks(term, page) : Promise.resolve(EMPTY_PAGE)),
    [term]
  );
  const results = useInfiniteBooks(searchLoader);

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

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(flowTimer.current);
    },
    []
  );

  const showToast = useCallback((message, ms = TOAST_MS) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), ms);
  }, []);

  // 같은 검색어면 다시 불러오지 않고 결과 화면으로 돌아간다. 다른 검색어면 새로 검색한다.
  const handleSearch = () => {
    const next = query.trim();
    if (!next) {
      showToast("검색어를 입력해주세요.");
      return;
    }
    setTerm(next);
    setView("results");
  };

  const openBook = (b) => {
    setBook(b);
    setView("detail");
  };

  const addMine = async (b) => {
    const result = await addToMyLibrary(b);
    if (result === "added") showToast("나의 서재에 추가되었어요.");
    else if (result === "exists") showToast("이미 나의 서재에 있는 책이에요.");
    else showToast("저장하지 못했어요.");
  };

  const openInvite = (b) => {
    setBook(b);
    setView("invite");
  };

  // 친구는 실제 사용자여야 하고, 상대가 수락해야 함께 읽기가 시작된다.
  // 여기서는 요청(POST /library/joints)만 보내고, 공동서재(7번)는 만들지 않는다.
  // TODO: 수락 여부를 알 수 있는 API(요청 목록/상태 조회)가 생기면 수락된 요청부터 addToSharedLibrary + 7번 화면으로 연결
  const startTogether = async ({ id }) => {
    if (id === getMe().key) {
      showToast("자기 자신과는 함께 읽을 수 없어요.");
      return;
    }
    setStarting(true);
    const sent = await requestCoReading(id);
    setStarting(false);
    if (!sent) {
      showToast("함께 읽기를 요청하지 못했어요. 아이디를 확인해주세요.");
      return;
    }
    showToast("함께 읽기를 요청했어요. 친구가 수락하면 시작돼요.", START_TOAST_MS + 1000);
    setView("detail");
  };

  // TODO: 타이머 페이지가 만들어지면 선택한 책으로 타이머 페이지에 이동
  const readNow = () => {};

  const showSearchBar = view === "list" || view === "results" || view === "detail";

  return (
    <div className="bs">
      <div className="bs-xp">
        <i style={{ maskImage: `url(${xpIcon})`, WebkitMaskImage: `url(${xpIcon})` }} aria-hidden="true" />
        <span>{totalXp}</span>
      </div>

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          {showSearchBar && <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />}

          {view === "list" && <BookList list={bestsellers} onOpen={openBook} />}
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
          {view === "shared" && book && friend && <SharedLibrary book={book} friend={friend} />}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
};

// 사이드바의 '책 검색'을 다시 누르면(location.key 변경) 처음 화면(1번)으로 돌아간다.
const BookSearch = () => {
  const location = useLocation();
  return <BookSearchFlow key={location.key} initialBook={location.state?.book ?? null} />;
};

export default BookSearch;
