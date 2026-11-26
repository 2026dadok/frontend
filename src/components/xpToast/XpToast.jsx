import { useEffect, useRef, useState } from "react";
import { subscribeXpToast } from "./xpToastBus";
import xpIcon from "../../images/icon-xp.png";
import "./XpToast.css";

const SHOW_MS = 3000;

const XpToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeXpToast((next) => {
      clearTimeout(timer.current);
      setToast(next);
      timer.current = setTimeout(() => setToast(null), SHOW_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;
  return (
    <div className="xp-toast" role="status" key={toast.key}>
      <i style={{ maskImage: `url(${xpIcon})`, WebkitMaskImage: `url(${xpIcon})` }} aria-hidden="true" />
      <p>
        {toast.title}
        {/* XP 를 모르는 알림(예: 공동서재 승리, 백엔드가 아직 보상 XP 를 주지 않음)은 제목만 */}
        {toast.xp != null && (
          <>
            <br />+ {toast.xp} XP 획득
          </>
        )}
      </p>
    </div>
  );
};

export default XpToast;
