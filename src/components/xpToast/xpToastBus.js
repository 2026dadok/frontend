// XP를 받았을 때 화면 맨 위에 알림창을 띄우는 간단한 알림 전달 통로.
// 어느 코드에서든 showXpToast() 를 부르면, 공통 레이아웃에 붙어 있는 XpToast 가 받아서 보여준다.

const listeners = new Set();

// title: 보상 이름 (예: "일일 출석 보상"), xp: 받은 XP
export const showXpToast = ({ title, xp }) => {
  listeners.forEach((listener) => listener({ title, xp, key: Date.now() }));
};

export const subscribeXpToast = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
