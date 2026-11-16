import { useEffect, useState } from "react";
import { getSidebarWidth, getUiScale } from "./uiScale";

// 디자인 기준 크기(사이드바 제외). 창이 이보다 작으면 화면 전체를 비율로 줄여 한 화면에 맞추고, 큰 모니터에서는 키운다.
// 홈, 책 검색, 서고가 같이 쓴다.
const DESIGN_W = 1419;
const DESIGN_H = 967; // 위 여백(72) + 왼쪽 열 높이(867) + 아래 여백(28)

// 작은 창: 1보다 작게 줄인다. 큰 모니터: getUiScale() 만큼 키운다 (사이드바도 같은 비율로 커져서 화면이 똑같아 보인다).
const calcScale = (fitHeight) =>
  Math.min(
    getUiScale(),
    fitHeight ? window.innerHeight / DESIGN_H : Infinity,
    (window.innerWidth - getSidebarWidth()) / DESIGN_W,
  );

// fitHeight: false 면 가로 폭만 맞춘다. (위아래로 스크롤되는 페이지용)
const useFitScale = ({ fitHeight = true } = {}) => {
  const [scale, setScale] = useState(() => calcScale(fitHeight));
  useEffect(() => {
    const onResize = () => setScale(calcScale(fitHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitHeight]);
  return scale;
};

export default useFitScale;
