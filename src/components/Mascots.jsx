// 큰 그림 파일(960x1280)에서 마스코트가 있는 부분만 잘라 보여주는 그림들.
// 크기·위치는 className 으로 넘긴 쪽에서 width 와 position 만 정하면 된다 (높이는 비율로 정해진다).
import askImg from "../images/da-question.png";
import vImg from "../images/v.png";
import "./Mascots.css";

// "다?" 하고 고개를 갸웃하는 독다지 (da-question.png 의 (534,83)~(872,541))
export const AskMascot = ({ className = "" }) => (
  <div className={`mascot-crop ask ${className}`} aria-hidden="true">
    <img src={askImg} alt="" />
  </div>
);

// 브이 하는 독다지 (v.png)
export const VMascot = ({ className = "" }) => (
  <div className={`mascot-crop v ${className}`} aria-hidden="true">
    <img src={vImg} alt="" />
  </div>
);
