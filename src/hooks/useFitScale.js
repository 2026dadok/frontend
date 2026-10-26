import { useEffect, useState } from "react";

// 디자인 기준 크기(사이드바 제외). 창이 이보다 작으면 화면 전체를 비율로 줄여 한 화면에 맞춘다.
// 홈, 책 검색, 서고가 같이 쓴다.
const DESIGN_W = 1419;
const DESIGN_H = 967; // 위 여백(72) + 왼쪽 열 높이(867) + 아래 여백(28)
const SIDEBAR_W = 103;

const calcScale = (fitHeight) =>
  Math.min(1, fitHeight ? window.innerHeight / DESIGN_H : 1, (window.innerWidth - SIDEBAR_W) / DESIGN_W);

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
