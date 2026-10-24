import { useState } from "react";
import mascotImg from "../../images/mascot.png";

// 5·6번 화면: 같이 읽을 친구 초대 (6번은 같은 화면 위에 토스트만 뜬다)
const CoInvite = ({ book, busy, onSubmit, showToast }) => {
  const [friendId, setFriendId] = useState("");
  const [friendName, setFriendName] = useState("");

  const submit = () => {
    if (busy) return;
    const id = friendId.trim();
    const name = friendName.trim();
    if (!id || !name) {
      showToast("아이디와 이름을 입력해주세요.");
      return;
    }
    onSubmit({ id, name });
  };

  const onEnter = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
  };

  return (
    <>
      <img className="bs-co-cover" src={book.cover} alt={book.title} />
      <div className="bs-co-right">
        <p className="bs-co-day">함께 읽은 지 D+0</p>
        <h1>같이 읽을 친구를 초대해주세요</h1>

        <input
          className="bs-co-input one"
          type="text"
          placeholder="아이디"
          aria-label="친구 아이디"
          value={friendId}
          onChange={(e) => setFriendId(e.target.value)}
          onKeyDown={onEnter}
        />
        <input
          className="bs-co-input two"
          type="text"
          placeholder="이름"
          aria-label="친구 이름"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          onKeyDown={onEnter}
        />
        <button type="button" className="bs-co-submit" disabled={busy} onClick={submit}>
          함께 읽기
        </button>
      </div>
      <img className="bs-co-mascot" src={mascotImg} alt="" />
    </>
  );
};

export default CoInvite;
