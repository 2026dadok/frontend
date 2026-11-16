// 큰 모니터용 확대 배율(--ui).
// 디자인 기준 화면(사이드바 103 + 본문 1419 = 1522 x 967)보다 창이 크면 그만큼 화면 전체(사이드바·본문·로그인 카드·소개 화면)를 같은 비율로 키운다.
// 맥북처럼 기준보다 작은 화면에서는 1 (키우지 않는다. 줄이는 건 각 페이지의 --s 가 한다). 4K 에서 너무 커지지 않게 2배까지만.
// 값은 <html> 의 CSS 변수 --ui 에 넣어서 CSS 에서 var(--ui) 로 쓴다.
const BASE_W = 1522;
const BASE_H = 967;
const MAX_UI = 2;

export const getUiScale = () =>
  Math.min(MAX_UI, Math.max(1, Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H)));

// 사이드바 실제 너비(px)
export const getSidebarWidth = () => 103 * getUiScale();

const apply = () => document.documentElement.style.setProperty("--ui", String(getUiScale()));

// main.jsx 에서 한 번 부른다. 창 크기가 바뀔 때마다 다시 계산한다.
export const installUiScale = () => {
  apply();
  window.addEventListener("resize", apply);
};
