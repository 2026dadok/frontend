import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import useToast from "../../hooks/useToast";
import { syncCommentaries } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import { AskMascot, VMascot } from "../../components/Mascots";
import { aiErrorMessage, askNextQuestion, deleteReview, generateReview, MAX_MESSAGES } from "./aiReviewApi";
import { aiDraftFor, clearDraft, countDays, saveAiDraft } from "./reviewExtras";
import { MAX_LENGTH } from "./ReviewModals";
import { formatDate } from "./format";
import moleImg from "../../images/dokddage.png";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas)과 알림(.bs-toast)을 같이 쓴다
import "./AiReview.css";

const DONE_MS = 1600; // "감상문을 모두 작성했어요!" 를 보여주는 시간

// AI 감상문 ("독다지와 함께"): 타이머에서 책을 덮고 '독다지와 함께'를 고르면 온다. (state.book = 서재 책)
//   chat    독다지가 묻고 내가 답한다 (POST /api/v1/reviews/interview)
//   writing "나눈 이야기를 바탕으로 감상문 작성 중..." (POST /api/v1/reviews/generate, 서버가 만들고 바로 저장)
//   done    "감상문을 모두 작성했어요!"
//   result  만든 감상문 확인 → 다시 만들기 / 저장하기(감상문 화면으로)
// 채팅 중에 나가면 나눈 말을 남겨 두고(reviewExtras.saveAiDraft), 홈 말풍선의 [AI감상문 바로 가기]로 오면(state.resume) 이어서 한다.
const AiReview = () => {
  const scale = useFitScale();
  const navigate = useNavigate();
  const location = useLocation();
  const book = location.state?.book ?? null;
  const [toast, showToast] = useToast();
  // 홈에서 이어 하러 왔으면 남겨 둔 채팅을 불러온다 (처음 한 번만 읽는다)
  const [saved] = useState(() => (location.state?.resume && book ? aiDraftFor(book) : null));

  const [step, setStep] = useState("chat");
  const [day, setDay] = useState(saved?.day ?? null);
  const [messages, setMessages] = useState(saved?.messages ?? []); // { role: "assistant" | "user", content }
  const [waiting, setWaiting] = useState(false); // 독다지의 답을 기다리는 중
  const [ready, setReady] = useState(saved?.ready ?? false); // 감상문을 만들 만큼 이야기했는지 (서버가 알려준다)
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [review, setReview] = useState(null); // { id, content, date }
  const listRef = useRef(null);

  // 오늘이 몇 일차인지 (감상문 화면과 같은 계산)
  useEffect(() => {
    if (!book) return undefined;
    let alive = true;
    syncCommentaries(book, "me").then((list) => alive && setDay(countDays(book, list)));
    return () => {
      alive = false;
    };
  }, [book]);

  // history: 지금까지 나눈 말 (내가 방금 쓴 말 포함). 실패해도 내가 쓴 말은 화면에 남긴다
  const ask = async (history) => {
    setMessages(history);
    setWaiting(true);
    setError("");
    const result = await askNextQuestion(book, history);
    setWaiting(false);
    if (!result.ok) {
      setError(aiErrorMessage(result.status));
      return;
    }
    setMessages([...history, { role: "assistant", content: result.question }]);
    // 메시지는 20개까지만 보낼 수 있다. 거의 찼으면 지금까지의 이야기로 감상문을 만든다
    setReady(result.ready || history.length + 1 >= MAX_MESSAGES - 1);
  };

  // 첫 질문. 이어 하는 중이면 묻지 않는다 (마지막 말이 내 답이면 그 답에 대한 질문만 다시 받는다)
  useEffect(() => {
    if (!book) return;
    if (!saved) Promise.resolve().then(() => ask([]));
    else if (saved.messages.at(-1)?.role === "user" && !saved.ready) Promise.resolve().then(() => ask(saved.messages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 채팅 중에 나가도 이어 할 수 있게 나눈 말을 남긴다 (감상문을 만들면 지운다)
  useEffect(() => {
    if (book && step === "chat") saveAiDraft(book, day, messages, ready);
  }, [book, step, day, messages, ready]);

  // 새 말이 오면 맨 아래로
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, waiting]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || waiting || ready) return;
    setInput("");
    ask([...messages, { role: "user", content: text }]);
  };

  const make = async () => {
    setStep("writing");
    const result = await generateReview(book, messages);
    if (!result.ok) {
      setStep(review ? "result" : "chat");
      showToast(aiErrorMessage(result.status));
      return;
    }
    clearDraft("ai"); // 감상문이 저장됐으니 홈의 이어 하기 말풍선은 없앤다
    // 다시 만들기였으면 새 감상문이 저장된 뒤 이전 것을 지운다 (감상문이 두 개 남지 않게)
    if (review?.id) deleteReview(review.id);
    setReview({ id: result.reviewId, content: result.content, date: new Date().toISOString() });
    setStep("done");
    setTimeout(() => setStep("result"), DONE_MS);
  };

  // 저장은 만들 때 서버가 이미 했다 → 감상문 화면에서 확인
  const goReviews = () => navigate(PATHS.review, { state: { book } });
  const writeMyself = () => navigate(`${PATHS.review}?write=1`, { state: { book } });

  if (!book) {
    return (
      <div className="bs ai">
        <p className="ai-none">타이머에서 책을 다 읽은 뒤 &apos;독다지와 함께&apos;를 눌러주세요.</p>
      </div>
    );
  }

  const heading = `${book.title}${day ? ` ${day}일차` : ""}`;

  return (
    <div className="bs ai">
      <XpTotal />
      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          {step === "chat" && (
            <section className="ai-chat" aria-label="독다지와 감상문 이야기">
              <header>
                <h1>{heading}</h1>
                {ready && (
                  <button type="button" className="ai-make" onClick={make}>
                    감상문 만들기
                  </button>
                )}
              </header>

              <ol className="ai-messages" ref={listRef} aria-live="polite">
                {messages.map((m, i) => (
                  <li key={i} className={m.role === "assistant" ? "from-ai" : "from-me"}>
                    {m.role === "assistant" && <img className="ai-avatar" src={moleImg} alt="" />}
                    <p>{m.content}</p>
                  </li>
                ))}
                {waiting && (
                  <li className="from-ai">
                    <img className="ai-avatar" src={moleImg} alt="" />
                    <p className="ai-typing" aria-label="독다지가 답을 쓰는 중">
                      <i />
                      <i />
                      <i />
                    </p>
                  </li>
                )}
                {error && (
                  <li className="ai-error">
                    <p>{error}</p>
                    <div>
                      <button type="button" onClick={() => ask(messages)}>
                        다시 시도
                      </button>
                      <button type="button" onClick={writeMyself}>
                        스스로 쓰기
                      </button>
                    </div>
                  </li>
                )}
              </ol>

              <form className="ai-input" onSubmit={send}>
                <input
                  value={input}
                  maxLength={2000}
                  disabled={ready}
                  placeholder={ready ? "이제 감상문을 만들어 볼까요?" : "떠오르는 대로 적어보아요"}
                  aria-label="독다지에게 답하기"
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={!input.trim() || waiting || ready}>
                  보내기
                </button>
              </form>
            </section>
          )}

          {(step === "writing" || step === "done") && (
            <section className="ai-status">
              <div className="ai-bubble">
                <p className="ai-bubble-sub">{heading}</p>
                <p className="ai-bubble-main">{step === "writing" ? "나눈 이야기를 바탕으로 감상문 작성 중..." : "감상문을 모두 작성했어요!"}</p>
              </div>
              {step === "writing" ? <AskMascot className="ai-status-mole" /> : <VMascot className="ai-status-mole" />}
              {step === "writing" && (
                <p className="ai-dots" aria-label="작성 중">
                  <i />
                  <i />
                  <i />
                </p>
              )}
            </section>
          )}

          {step === "result" && review && (
            <section className="ai-result">
              <article className="ai-result-card">
                <h1>{heading}</h1>
                <div className="ai-result-text">{review.content}</div>
                <p className="ai-result-count">
                  {review.content.length}자 / {MAX_LENGTH}자
                </p>
                <footer>
                  <time>{formatDate(review.date)}</time>
                  <div>
                    <button type="button" onClick={make}>
                      다시 만들기
                    </button>
                    <button type="button" className="primary" onClick={goReviews}>
                      저장하기
                    </button>
                  </div>
                </footer>
              </article>
              <div className="ai-bubble small">
                <p className="ai-bubble-main">작성된 내용을 확인해봐요</p>
              </div>
              <img className="ai-result-mole" src={moleImg} alt="" />
            </section>
          )}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
};

export default AiReview;
