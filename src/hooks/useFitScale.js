import { useEffect, useState } from "react";

// 디자인 기준 크기(사이드바 제외). 창이 이보다 작으면 화면 전체를 비율로 줄여 한 화면에 맞춘다.
// 홈, 책 검색, 서고가 같이 쓴다.
const DESIGN_W = 1419;
const DESIGN_H = 967; // 위 여백(72) + 왼쪽 열 높이(867) + 아래 여백(28)
const SIDEBAR_W = 103;

const calcScale = () =>
  Math.min(1, window.innerHeight / DESIGN_H, (window.innerWidth - SIDEBAR_W) / DESIGN_W);

const useFitScale = () => {
  const [scale, setScale] = useState(calcScale);
  useEffect(() => {
    const onResize = () => setScale(calcScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
};

export default useFitScale;
