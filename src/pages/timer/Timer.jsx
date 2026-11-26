import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useToast from "../../hooks/useToast";
import GoalTimeInput from "../../components/goalTime/GoalTimeInput";
import { normalizeGoalTime } from "../../components/goalTime/goalTime";
import { Toast } from "../bookSearch/parts";
import { addToMyLibrary, findInMyLibrary, updateShelfBook } from "../bookSearch/bookStore";
import { QuoteAddModal } from "../quote/QuoteModals";
import { addQuote } from "../quote/quoteStore";
import { addStudyTime, fetchGoalTime, saveReadPages } from "./timerApi";
import { recordReadPages } from "../review/reviewExtras";
import { AskMascot } from "../../components/Mascots";
import { clearPendingRead, markPendingRead, savePendingRead } from "./pendingRead";
import { isLoggedIn } from "../../api/client";
import moleImg from "../../images/dokddage.png";
import "../bookSearch/BookSearch.css"; // .bs 버튼·알림 스타일을 같이 쓴다
import "../quote/Quote.css"; // 인용구 쓰기 팝업
import "./Timer.css";
import { getUiScale } from "../../hooks/uiScale";

// 디자인 기준 크기. 사이드바 없이 화면 전체를 쓰고, 창이 작으면 통째로 줄인다.
const DESIGN_W = 1520;
const DESIGN_H = 988;
const TICK_MS = 250;

const calcScale = () => Math.min(getUiScale(), window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H); // 큰 모니터에서는 키운다
const useScreenScale = () => {
  const [scale, setScale] = useState(calcScale);
  useEffect(() => {
    const onResize = () => setScale(calcScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
};

const toSeconds = (hhmm) => {
  const [h, m] = normalizeGoalTime(hhmm).split(":").map(Number);
  return h * 3600 + m * 60;
};
const pad = (n) => String(n).padStart(2, "0");
const formatClock = (sec) => `${pad(Math.floor(sec / 3600))} : ${pad(Math.floor((sec % 3600) / 60))} : ${pad(sec % 60)}`;
const formatRemain = (sec) => {
  const h = Math.floor(sec / 3600);
  const text = `${Math.floor((sec % 3600) / 60)}분 ${sec % 60}초`;
  return h ? `${h}시간 ${text}` : text;
};

// 읽은 시간(초). running 이 true 인 동안 올라간다. 탭이 백그라운드여도 실제 흐른 시간으로 센다
const useStopwatch = (running) => {
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    const startedAt = Date.now();
    const passed = () => Math.floor((Date.now() - startedAt) / 1000);
    const id = setInterval(() => setElapsed(base.current + passed()), TICK_MS);
    return () => {
      clearInterval(id);
      base.current += passed();
      setElapsed(base.current);
    };
  }, [running]);
  return elapsed;
};

const NoteIcon = () => (
  <svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="11" y="6" width="30" height="36" rx="3" />
    <path d="M24 6v36M6 13h8M6 19h8M6 25h8M6 31h8" />
  </svg>
);

// 타이머: 목표 시간 정하기 → 읽는 중(일시정지·시간 추가·책 덮기) → 여기까지인지 묻기 → 읽은 쪽수
//        → 감상문을 어떻게 쓸지 고르기 (독다지와 함께 = AI 감상문 / 스스로 = 감상문 쓰기 창)
// 서고·주간 경쟁의 '바로 읽기'에서 state.book 으로 읽을 책을 받는다.
const Timer = () => {
  const scale = useScreenScale();
  const navigate = useNavigate();
  const book = useLocation().state?.book ?? null;

  const [step, setStep] = useState("setup"); // setup | reading | askClose | pages | howRecord
  const [savedBook, setSavedBook] = useState(null); // 쪽수까지 저장한 책 (서버 번호가 채워진 값)
  const [goal, setGoal] = useState("00:30");
  const [running, setRunning] = useState(false);
  const elapsed = useStopwatch(running);
  const [clockHidden, setClockHidden] = useState(false);
  const [adding, setAdding] = useState(null); // 시간 추가 입력 중이면 "HH:MM"
  const [page, setPage] = useState("");
  const [saving, setSaving] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [toast, showToast] = useToast();

  // 목표 시간 응답이 늦게 와도, 이미 읽기를 시작했거나 직접 바꿨으면 덮어쓰지 않는다
  const goalTouchedRef = useRef(false);
  useEffect(() => {
    let alive = true;
    fetchGoalTime().then((value) => {
      if (alive && !goalTouchedRef.current) setGoal(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  const goalSeconds = toSeconds(goal);
  const reached = elapsed >= goalSeconds;

  const start = () => {
    if (!goalSeconds) {
      showToast("목표 시간을 입력해주세요.");
      return;
    }
    goalTouchedRef.current = true;
    setGoal(normalizeGoalTime(goal));
    setStep("reading");
    setRunning(true);
  };

  const addTime = () => {
    const extra = toSeconds(adding);
    if (extra) {
      const total = Math.min(goalSeconds + extra, 23 * 3600 + 59 * 60);
      setGoal(`${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}`);
    }
    setAdding(null);
  };

  const closeBook = () => {
    setRunning(false);
    setAdding(null);
    setStep("askClose");
  };

  const keepReading = () => {
    setStep("reading");
    setRunning(true);
  };

  // 오늘은 여기까지: 읽은 시간·쪽수를 저장하고 감상문 쓰기로 간다
  const finish = async () => {
    const readPage = Number(page);
    const total = Number(book.totalPage) || null;
    if (!Number.isInteger(readPage) || readPage < 1 || (total && readPage > total)) {
      showToast(total ? `1 ~ ${total} 사이의 쪽수를 입력해주세요.` : "읽은 쪽수를 입력해주세요.");
      return;
    }
    // 서버는 이전 진행도보다 낮은 쪽수를 받지 않는다
    const minPage = Number(book.readPage) || 0;
    if (readPage < minPage) {
      showToast(`지난번에 ${minPage}쪽까지 읽었어요. ${minPage}쪽 이상으로 입력해주세요.`);
      return;
    }
    setSaving(true);
    // 읽은 시간·쪽수는 서버의 책 번호로 저장한다. 서재에 없는 책(책 검색의 '바로 읽기')이면 먼저 나의 서재에 담는다
    let target = book;
    if (!Number.isInteger(book.jointId) && !Number.isInteger(book.serverBookId)) {
      const added = await addToMyLibrary(book);
      const shelf = added === "added" || added === "exists" ? findInMyLibrary(book) : null;
      target = shelf ? { ...book, ...shelf } : book;
    }
    const seconds = Math.round(elapsed); // 서버에는 초 단위로 보낸다
    // 저장 중에 로그인이 만료되면 로그인 화면으로 넘어가므로, 보내기 전에 기록을 보관해 둔다 (다시 로그인하면 전송)
    savePendingRead({ bookId: target.serverBookId, jointId: target.jointId, seconds, readPage });
    const [timeSaved, pagesSaved] = await Promise.all([
      addStudyTime(target.serverBookId, seconds).then((ok) => {
        if (ok) markPendingRead("time");
        return ok;
      }),
      saveReadPages(target, readPage).then((ok) => {
        if (ok) markPendingRead("pages");
        return ok;
      }),
    ]);
    setSaving(false);
    if (!isLoggedIn()) return; // 로그인 만료: 보관한 기록은 다시 로그인한 뒤 보낸다
    clearPendingRead();
    if (!timeSaved && !pagesSaved) {
      showToast("독서 기록을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
    // 하나만 실패하면 다시 저장하면 다른 쪽이 중복되므로, 알리고 넘어간다
    if (!timeSaved) alert("읽은 쪽수는 저장했지만 읽은 시간은 저장하지 못했어요.");
    if (!pagesSaved) alert("읽은 시간은 저장했지만 쪽수는 저장하지 못했어요.");
    // 감상문 카드에 "몇 쪽부터 몇 쪽까지" 보여주려고 기록해 둔다 (지난번 쪽수 다음 ~ 오늘 쪽수)
    const lastPage = findInMyLibrary(target)?.readPage ?? target.readPage ?? 0;
    recordReadPages(target, lastPage, readPage);
    updateShelfBook(target.id, { readPage });
    // AI 감상문은 나의 서재 책만 만들 수 있다 (백엔드가 내 서재 칸 번호 lib_book_id 를 받는다). 공동서재 책은 바로 쓰기 창으로
    if (Number.isInteger(target.jointId) || !Number.isInteger(target.libBookId)) {
      navigate(`${PATHS.review}?write=1`, { state: { book: target } });
      return;
    }
    setSavedBook(target);
    setStep("howRecord");
  };

  const saveQuote = async ({ book: quoteBook, page: quotePage, text }) => {
    setSaving(true);
    const result = await addQuote({ book: quoteBook, page: quotePage, text });
    setSaving(false);
    if (result !== "saved") {
      showToast("인용구를 저장하지 못했어요.");
      return;
    }
    setQuoteOpen(false);
    showToast("인용구 노트에 저장했어요.");
  };

  const renderBubble = () => {
    if (!book) {
      return (
        <>
          <p className="tm-question">어떤 책을 읽을까요?</p>
          <div className="tm-buttons">
            <button type="button" onClick={() => navigate(`${PATHS.library}?tab=my`)}>서고에서 고르기</button>
          </div>
        </>
      );
    }

    if (step === "setup") {
      return (
        <>
          <p className="tm-question">오늘의 목표 시간은 무엇인가요?</p>
          <GoalTimeInput
            className="tm-time"
            value={goal}
            onChange={(value) => {
              goalTouchedRef.current = true;
              setGoal(value);
            }}
          />
          <div className="tm-buttons">
            <button type="button" onClick={start}>시작하기</button>
            <button type="button" onClick={() => navigate(-1)}>돌아가기</button>
          </div>
        </>
      );
    }

    if (step === "askClose") {
      return (
        <>
          <p className="tm-question big">오늘 독서는 여기까지 인가요?</p>
          <div className="tm-buttons wide">
            <button type="button" onClick={() => setStep("pages")}>네!</button>
            <button type="button" onClick={keepReading}>아니요</button>
          </div>
        </>
      );
    }

    if (step === "howRecord") {
      return (
        <>
          <p className="tm-question big">책을 읽은 감상을 어떻게 기록하고 싶나요?</p>
          <div className="tm-buttons wide">
            <button type="button" onClick={() => navigate(PATHS.reviewAi, { state: { book: savedBook } })}>독다지와 함께</button>
            <button type="button" onClick={() => navigate(`${PATHS.review}?write=1`, { state: { book: savedBook } })}>스스로</button>
          </div>
        </>
      );
    }

    if (step === "pages") {
      return (
        <form
          className="tm-pages"
          noValidate // 쪽수 범위는 브라우저 말풍선 대신 화면 알림으로 안내한다
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) finish();
          }}
        >
          <p className="tm-question big">좋아요! 그럼 오늘 어디까지 읽으셨나요?</p>
          <input
            type="number"
            min="1"
            max={book.totalPage || undefined}
            value={page}
            autoFocus
            aria-label="읽은 쪽수"
            placeholder={book.readPage ? String(book.readPage) : ""}
            onChange={(e) => setPage(e.target.value)}
          />
          <div className="tm-buttons">
            <button type="submit" className="long" disabled={saving}>
              {saving ? "저장 중…" : "오늘은 여기까지"}
            </button>
          </div>
        </form>
      );
    }

    // 읽는 중
    const message = reached ? "목표 시간 달성!" : clockHidden ? "목표 시간까지..." : `목표 시간까지 앞으로 ${formatRemain(goalSeconds - elapsed)}`;
    return (
      <>
        {/* 시계를 누르면 숫자를 숨기고, 다시 누르면 보인다 */}
        <button type="button" className="tm-clock" aria-label={clockHidden ? "시간 보이기" : "시간 숨기기"} onClick={() => setClockHidden(!clockHidden)}>
          <span className="tm-sub">{message}</span>
          {!clockHidden && <span className="tm-elapsed">{formatClock(elapsed)}</span>}
        </button>

        {adding !== null ? (
          <form
            className="tm-add"
            onSubmit={(e) => {
              e.preventDefault();
              addTime();
            }}
          >
            <span>얼마나 더 읽을까요?</span>
            <GoalTimeInput className="tm-time small" value={adding} onChange={setAdding} />
            <button type="submit">추가</button>
            <button type="button" onClick={() => setAdding(null)}>취소</button>
          </form>
        ) : (
          <div className="tm-buttons wide">
            <button type="button" onClick={() => setRunning(!running)}>{running ? "일시정지" : "이어 읽기"}</button>
            <button type="button" onClick={closeBook}>책 덮기</button>
            <button type="button" onClick={() => setAdding("00:10")}>시간 추가</button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="bs tm">
      <Toast message={toast} />
      <div className="tm-stage" style={{ "--s": scale }}>
        {book && (
          <button type="button" className="tm-note" aria-label="인용구 노트 쓰기" onClick={() => setQuoteOpen(true)}>
            <NoteIcon />
          </button>
        )}
        <section className={`tm-bubble ${step === "reading" && clockHidden ? "short" : ""}`}>{renderBubble()}</section>
        {step === "howRecord" ? <AskMascot className="tm-ask" /> : <img className="tm-mole" src={moleImg} alt="" />}
      </div>

      {quoteOpen && (
        <QuoteAddModal scale={scale} books={[book]} saving={saving} onSubmit={saveQuote} onClose={() => setQuoteOpen(false)} />
      )}
    </div>
  );
};

export default Timer;
