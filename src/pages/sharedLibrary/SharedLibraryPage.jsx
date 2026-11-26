import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import SharedLibrary from "../bookSearch/SharedLibrary";
import { fetchJointDetail, getSharedLibrary, syncSharedLibrary } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import { showXpToast } from "../../components/xpToast/xpToastBus";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas)과 공동서재 모양(.bs-co-*, .bs-shared-*)을 같이 쓴다
import "./SharedLibraryPage.css";

const TOAST_MS = 2500;
const ENDED_MESSAGE = "함께 읽기가 종료되었습니다";

// 승리 알림은 공동서재마다 이 탭에서 한 번만 띄운다 (화면 상태라 sessionStorage)
const winShownKey = (jointId) => `sharedWinShown:${jointId}`;
const showWinToast = (detail) => {
  try {
    if (sessionStorage.getItem(winShownKey(detail.jointId))) return;
    sessionStorage.setItem(winShownKey(detail.jointId), "1");
  } catch {
    // 저장이 막힌 브라우저에서는 들어올 때마다 보여준다
  }
  // TODO: 백엔드가 승리 보상 XP 를 주면(지금은 지급 코드 없음) 그 값을 xp 로 넣는다 → "공동 서재 승리 보상 + N XP 획득"
  const xp = detail.winXp ?? null;
  showXpToast({ title: xp != null ? "공동 서재 승리 보상" : "공동 서재에서 승리했어요!", xp });
};

// 서고 > 공동 서재에서 책을 누르면 오는 공동서재 페이지.
// 두 사람의 진행률은 백엔드(GET /library/joints/{joint_id})가 준 값만 쓴다.
//   진행 중:       두 사람의 진행률
//   내가 먼저 완독: 맨 위에 "승리" + 승리 알림 (처음 한 번)
//   둘 다 완독:     "함께 읽기가 종료되었습니다" 알림
const SharedLibraryView = () => {
  const scale = useFitScale();
  const location = useLocation();
  // 서고에서 누른 공동 서재 기록. 주소로 바로 들어오면 첫 번째 기록을 보여준다. (TODO: 공동서재 번호를 주소에 담기)
  const [record, setRecord] = useState(() => location.state?.record ?? getSharedLibrary()[0] ?? null);
  const [detail, setDetail] = useState(null); // 서버 상세 (오기 전에는 목록에 있던 값으로 그린다)
  const [toast, setToast] = useState("");

  const shown = detail ?? record;
  const myPercent = shown?.myPercent ?? 0;
  const friendPercent = shown?.friendPercent ?? 0;
  const iWon = Boolean(detail) && myPercent === 100 && friendPercent < 100;

  useEffect(() => {
    let alive = true;
    // 새로 열어서 메모리에 공동서재가 없으면 서버 목록에서 첫 번째를 고른다
    const target = record ? Promise.resolve(record) : syncSharedLibrary().then((list) => list[0] ?? null);
    target.then((found) => {
      if (!alive || !found) return null;
      if (!record) setRecord(found);
      return fetchJointDetail(found);
    }).then((result) => {
      if (!alive || !result) return;
      setDetail(result);
      if (result.myPercent === 100 && result.friendPercent === 100) setToast(ENDED_MESSAGE);
      else if (result.myPercent === 100) showWinToast(result); // 내가 먼저 완독 = 승리
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="bs">
      <XpTotal />

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          {iWon && <h1 className="shared-win">승 리</h1>}

          {shown ? (
            <SharedLibrary book={shown} friend={shown} myPercent={myPercent} friendPercent={friendPercent} />
          ) : (
            <p className="shared-empty">
              공동 서재에서 책을 선택해주세요. <Link to={`${PATHS.library}?tab=shared`}>공동 서재로 가기</Link>
            </p>
          )}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
};

// 다른 공동서재로 이동하면 처음부터 다시 그린다
const SharedLibraryPage = () => {
  const location = useLocation();
  return <SharedLibraryView key={location.key} />;
};

export default SharedLibraryPage;
