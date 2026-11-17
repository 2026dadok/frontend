import { useEffect, useState } from "react";
import { getUiScale } from "../../../hooks/uiScale";

// 로그인·회원가입 카드(1289 x 689) 배율. 큰 모니터에서는 --ui 만큼 키우고, 창이 카드보다 좁거나 낮으면 줄여서 옆으로 스크롤되지 않게 한다.
const CARD_W = 1289;
const CARD_H = 689;
const MARGIN = 32; // 카드 둘레 여백

const calc = () => Math.min(getUiScale(), (window.innerWidth - MARGIN) / CARD_W, (window.innerHeight - MARGIN) / CARD_H);

const useAuthScale = () => {
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
};

export default useAuthScale;
