import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { showXpToast } from "../../components/xpToast/xpToastBus";
import SharedLibrary from "../bookSearch/SharedLibrary";
import { getSharedLibrary } from "../bookSearch/bookStore";
import { Toast, XpTotal } from "../bookSearch/parts";
import "../bookSearch/BookSearch.css"; // 화면 틀(.bs, .bs-stage, .bs-canvas)과 공동서재 모양(.bs-co-*, .bs-shared-*)을 같이 쓴다
import "./SharedLibraryPage.css";

const WIN_REWARD_XP = 90; // TODO: 승리 보상 XP 는 백엔드 값으로 교체
const TOAST_MS = 2500;
const XP_TOAST_MS = 3000; // XpToast 가 떠 있는 시간. 사라진 뒤에 "승리" 제목을 보여준다 (같은 자리라 겹치지 않게)
const ENDED_MESSAGE = "함께 읽기가 종료되었습니다";

// 미리보기용: 주소에 ?me=100&friend=78 처럼 붙이면 그 진행률로 화면이 바뀐다.
// TODO: 백엔드에서 두 사람의 진행률(읽은 쪽수 / 전체 쪽수)을 받아오면 이 부분을 교체하고 미리보기는 지운다.
const readPercent = (value) => {
  const n = Number(value);
  return value !== null && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
};

// 서고 > 공동 서재에서 책을 누르면 오는 공동서재 페이지.
//   진행 중:       두 사람의 진행률
//   내가 먼저 완독: 맨 위에 "승리" + XP 보상 알림
//   둘 다 완독:     "함께 읽기가 종료되었습니다" 알림
const SharedLibraryView = () => {
  const scale = useFitScale();
  const location = useLocation();
  const [params] = useSearchParams();
  // 서고에서 누른 공동 서재 기록. 주소로 바로 들어오면 첫 번째 기록을 보여준다. (TODO: 책을 가리키는 값으로 교체)
  const record = location.state?.record ?? getSharedLibrary()[0] ?? null;

  const myPercent = readPercent(params.get("me"));
  const friendPercent = readPercent(params.get("friend"));
  const iWon = myPercent === 100 && friendPercent < 100;
  const finished = myPercent === 100 && friendPercent === 100;

  const [toast, setToast] = useState(finished ? ENDED_MESSAGE : "");
  const [winTitleVisible, setWinTitleVisible] = useState(false);

  useEffect(() => {
    if (iWon) showXpToast({ title: "공동 서재 승리 보상", xp: WIN_REWARD_XP });
    const toastTimer = setTimeout(() => setToast(""), TOAST_MS);
    const titleTimer = setTimeout(() => setWinTitleVisible(true), XP_TOAST_MS + 200);
    return () => {
      clearTimeout(toastTimer);
      clearTimeout(titleTimer);
    };
  }, [iWon]);

  return (
    <div className="bs">
      <XpTotal />

      <div className="bs-stage" style={{ "--s": scale }}>
        <div className="bs-canvas">
          {iWon && winTitleVisible && <h1 className="shared-win">승 리</h1>}

          {record ? (
            <SharedLibrary book={record} friend={record} myPercent={myPercent} friendPercent={friendPercent} />
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

// 주소(진행률 미리보기 값)가 바뀌면 처음부터 다시 그린다
const SharedLibraryPage = () => {
  const location = useLocation();
  return <SharedLibraryView key={location.key} />;
};

export default SharedLibraryPage;
