import { memRead, memWrite } from "./session";
import { apiFetch, authHeaders } from "./client";
import { showXpToast } from "../components/xpToast/xpToastBus";

// 일일 출석. 출석은 백엔드가 알려주는 게 아니라 프런트가 직접 보낸다. (POST /quests/attendance, 로그인 상태, 하루 1회)
// 서버가 받아주면 화면 맨 위에 XP 알림창을 띄운다.
// 퀘스트 달성 여부는 퀘스트 목록의 done 값으로만 판단한다. (홈이 목록을 다시 받아 보여준다)

// 오늘 이미 성공했으면 다시 보내지 않는다. 실패(이미 출석했거나 서버 문제)는 조용히 넘기고 다음에 다시 시도한다.
const checkAttendance = async () => {
  const today = new Date().toLocaleDateString("sv-SE"); // yyyy-MM-dd (사용자 기기 날짜)
  const storageKey = "attendanceDate"; // 메모리 (로그아웃하면 지워진다). 새로 열면 다시 보내고, 이미 했으면 서버가 409 를 준다
  try {
    if (memRead(storageKey) === today) return;
    const res = await apiFetch("/quests/attendance", { method: "POST", headers: authHeaders() });
    if (res.status === 409) {
      memWrite(storageKey, today); // 이미 출석했으면 409 → 오늘은 다시 보내지 않는다
      return;
    }
    if (!res.ok) return;
    memWrite(storageKey, today);
    const data = await res.json().catch(() => null);
    // 응답: { message, reward_xp } (전체 완료 보상 포함)
    const xp = Number(data?.reward_xp) || 0;
    if (xp > 0) showXpToast({ title: "일일 출석 보상", xp });
  } catch {
    // 서버가 아직 준비되지 않았을 때 등
  }
};

// 레이아웃과 홈이 동시에 부를 수 있다. 이미 보내는 중이면 같은 요청을 기다려서 한 번만 보낸다.
let inflight = null;
export const ensureAttendance = () => {
  if (!inflight) {
    inflight = checkAttendance().finally(() => {
      inflight = null;
    });
  }
  return inflight;
};
