// 타이머(책 읽기) 관련 백엔드 호출.
// 타이머 페이지의 '책 덮기' 버튼에서 사용한다. (타이머 페이지는 아직 없음)
//
// 일일 퀘스트 "30분 독서하기" 같은 퀘스트는 프런트가 판단하지 않는다.
// 읽은 시간만 보내면 백엔드가 오늘 읽은 시간을 합쳐서 퀘스트 달성 여부를 계산하고,
// 홈의 퀘스트 목록(GET /quests/daily)에 done 값으로 내려준다.

// 이번에 읽은 시간을 백엔드에 보낸다. 명세서: POST /times (bookID, readtime) → message, today_readtime
// bookID 는 데이터베이스에 저장된 책의 고유 번호(서재에 담을 때 서버가 준 book_id)다. 성공하면 오늘 읽은 시간(today_readtime)을 돌려준다.
// TODO: readtime 의 단위(분/초)는 백엔드와 확인. 명세서에는 단위가 없다.
export const addStudyTime = async (bookID, readtime) => {
  if (!Number.isInteger(bookID) || !Number.isInteger(readtime) || readtime <= 0) return null;
  try {
    const res = await fetch("/times", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
      },
      body: JSON.stringify({ bookID, readtime }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return { todayReadtime: data?.today_readtime ?? null };
  } catch {
    return null;
  }
};
