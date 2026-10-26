import { useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import { daysSince, getMe } from "./bookStore";
import { Avatar } from "./parts";

const Progress = ({ label, percent }) => (
  <section className="bs-shared-card">
    <Avatar size={81} />
    <div className="bs-shared-info">
      <strong>{label}</strong>
      <div className="bs-shared-bar">
        <div className="track">
          <div style={{ width: `${percent}%` }} />
        </div>
        <span>{percent}%</span>
      </div>
    </div>
  </section>
);

// 7번 화면: 함께 읽기가 시작된 공동서재
// 진행률(myPercent, friendPercent)은 부모가 내려준다. TODO: 백엔드 연결 후 (읽은 쪽수 / 전체 쪽수)로 계산.
const SharedLibrary = ({ book, friend, myPercent = 0, friendPercent = 0 }) => {
  const me = getMe();
  const navigate = useNavigate();
  return (
    <>
      <img className="bs-co-cover" src={book.cover} alt={book.title} />
      <div className="bs-co-right wide">
        <p className="bs-co-day">함께 읽은 지 D+{daysSince(friend.startedAt)}</p>
        <h1>{me.displayName}님과 {friend.friendName}님의 공동서재</h1>
        <p className="bs-shared-sub">
          {[book.publisher, book.author && `${book.author} 지음`].filter(Boolean).join(" | ")}
        </p>

        <div className="bs-shared-cards">
          <Progress label={`${me.displayName} (나)`} percent={myPercent} />
          <Progress label={friend.friendName} percent={friendPercent} />
        </div>

        <button type="button" className="bs-pill-btn wide" onClick={() => navigate(`${PATHS.review}?who=friend`, { state: { book } })}>
          친구 감상평 보기
        </button>
        <button type="button" className="bs-pill-btn wide" onClick={() => navigate(PATHS.review, { state: { book } })}>
          내 감상평 보기
        </button>
      </div>
    </>
  );
};

export default SharedLibrary;
