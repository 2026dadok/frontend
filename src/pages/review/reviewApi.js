// 감상문 화면에서 쓰는 데이터. 아직 백엔드가 없는 항목은 TODO.
import { getCommentaries } from "../bookSearch/bookStore";

// 감상문 목록: [{ day, content, date }]  (day = 몇 일차, date = ISO 날짜)
// TODO: 명세서에 감상문 조회 API가 없다. 정해지면 내 것 / 친구 것을 서버에서 받아온다. (GET /bookstore/feeling_page 는 화면 주소로 보임)
export const fetchMyCommentaries = (bookId) => getCommentaries(bookId);
export const fetchFriendCommentaries = () => [];

// 디자인 확인용 예시 (주소에 ?demo=1 을 붙였을 때만 사용). TODO: 백엔드 연결 후 삭제
export const DEMO_COMMENTARIES = [
  { day: 10, date: "2026-09-20", content: `마지막 장을 덮고 나서도 한동안 책을 손에서 놓지 못했다. "나는 불행한 기억을 사랑했다"라는 첫 문장이 결국 이 모든 서사의 정점이었음을 깨닫는다. 타인에게 보여주기 위해 정갈하게 포장했던 기억들이 실은 얼마나 얄팍한 거짓이었는지, 그리고 그 서늘한 진실 앞에서 나는 어떤 사람인지 오래 생각했다.` },
  { day: 9, date: "2026-09-19", content: "숨을 죽이고 읽게 되는 구간. 거짓으로 오랫동안 덮어둔 기억이 균열을 일으킬 때의 그 서늘함이란." },
  { day: 8, date: "2026-09-18", content: "진실에 한 걸음 다가갈수록 마음이 자꾸 아슬아슬해진다. 작가가 인물의 심리를 다루는 결이 워낙 촘촘해서, 나도 모르게 주인공의 불안에 온전히 동화되어버린다. 오늘 밤은 쉽게 잠들기 힘들 것 같다." },
  { day: 7, date: "2026-09-17", content: "스스로를 보호하기 위해 스스로 만든 기억이라는 방어기제. 참 슬프고도 아름다운 거짓말이다." },
  { day: 6, date: "2026-09-16", content: "문득 나 역시 외면하고 싶었던 기억들을 예쁜 포장지로 덮어둔 채 살아가고 있는 건 아닌가 하는 생각이 들었다. 책 속 문장들이 자꾸만 내 개인적인 기억들을 건드린다." },
  { day: 5, date: "2026-09-15", content: "첫 문장부터 문체의 밀도가 남다르다. 조금은 기이하고 서늘하지만, 단숨에 몰입하게 만드는 묘한 힘이 있다." },
];
