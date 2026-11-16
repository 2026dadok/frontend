import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { showXpToast } from "../../components/xpToast/xpToastBus";
import SharedLibrary from "../bookSearch/SharedLibrary";
import { fetchJointDetail, getSharedLibrary } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas)과 공동서재 모양(.bs-co-*, .bs-shared-*)을 같이 쓴다
import "./SharedLibraryPage.css";

const TOAST_MS = 2500;
const XP_TOAST_MS = 3000; // XpToast 가 떠 있는 시간. 사라진 뒤에 "승리" 제목을 보여준다 (같은 자리라 겹치지 않게)
const ENDED_MESSAGE = "함께 읽기가 종료되었습니다";

// 서고 > 공동 서재에서 책을 누르면 오는 공동서재 페이지.
// 두 사람의 진행률과 승리 보상은 백엔드(GET /library/joints/{joint_id})가 준 값만 쓴다.
//   진행 중:       두 사람의 진행률
//   내가 먼저 완독: 맨 위에 "승리" + XP 보상 알림 (보상 XP 는 서버 값)
//   둘 다 완독:     "함께 읽기가 종료되었습니다" 알림
const SharedLibraryView = () => {
  const scale = useFitScale();
  const location = useLocation();
  // 서고에서 누른 공동 서재 기록. 주소로 바로 들어오면 첫 번째 기록을 보여준다. (TODO: 공동서재 번호를 주소에 담기)
  const record = location.state?.record ?? getSharedLibrary()[0] ?? null;
  const [detail, setDetail] = useState(null); // 서버 상세 (오기 전에는 목록에 있던 값으로 그린다)
  const [toast, setToast] = useState("");
  const [winTitleVisible, setWinTitleVisible] = useState(false);

  const shown = detail ?? record;
  const myPercent = shown?.myPercent ?? 0;
  const friendPercent = shown?.friendPercent ?? 0;
  const iWon = Boolean(detail) && myPercent === 100 && friendPercent < 100;

  useEffect(() => {
    let alive = true;
    fetchJointDetail(record).then((result) => {
      if (!alive || !result) return;
      setDetail(result);
      const won = result.myPercent === 100 && result.friendPercent < 100;
      if (result.myPercent === 100 && result.friendPercent === 100) setToast(ENDED_MESSAGE);
      if (won && result.rewardXp > 0) showXpToast({ title: "공동 서재 승리 보상", xp: result.rewardXp });
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

  useEffect(() => {
    if (!iWon) return undefined;
    const timer = setTimeout(() => setWinTitleVisible(true), XP_TOAST_MS + 200);
    return () => clearTimeout(timer);
  }, [iWon]);

  return (
    <div className="bs">
      <XpTotal />

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          {iWon && winTitleVisible && <h1 className="shared-win">승 리</h1>}

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
