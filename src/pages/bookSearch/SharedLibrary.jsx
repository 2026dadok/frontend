import { useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useMyImage from "../../hooks/useMyImage";
import { daysSince, getMe } from "./bookStore";
import { Avatar } from "./parts";

const Progress = ({ label, percent, image }) => (
  <section className="bs-shared-card">
    {image ? <img className="bs-shared-avatar" src={image} alt="" /> : <Avatar size={81} />}
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
  const myImage = useMyImage("profile"); // 마이페이지에서 바꾼 내 프로필 사진
  const navigate = useNavigate();
  // 이름을 모를 때(로그인 정보 없음) "나 (나)" 로 겹치지 않게
  const myLabel = me.displayName === "나" ? "나" : `${me.displayName} (나)`;
  return (
    <>
      <img className="bs-co-cover" src={book.cover} alt={book.title} />
      <div className="bs-co-right wide">
        <p className="bs-co-day">함께 읽은 지 D+{daysSince(friend.startedAt)}</p>
        <h1>{me.displayName === "나" ? "나와" : `${me.displayName}님과`} {friend.friendName}님의 공동서재</h1>
        <p className="bs-shared-sub">
          {[book.publisher, book.author && `${book.author} 지음`].filter(Boolean).join(" | ")}
        </p>

        <div className="bs-shared-cards">
          <Progress label={myLabel} percent={myPercent} image={myImage} />
          {/* TODO: 친구 프로필 사진은 공동서재 API(members)에 사진 주소가 오면 image 로 넘긴다 */}
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
