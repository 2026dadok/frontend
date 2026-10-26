import { useEffect, useRef, useState } from "react";
import { subscribeXpToast } from "./xpToastBus";
import xpIcon from "../../images/icon-xp.png";
import "./XpToast.css";

const SHOW_MS = 3000;

// 화면 맨 위 가운데에 "○○ 보상 + N XP 획득"을 잠깐 보여준다. (공통 레이아웃에 한 번만 붙인다)
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
        <br />+ {toast.xp} XP 획득
      </p>
    </div>
  );
};

export default XpToast;
