import badgeImg from "../images/wandok.png";

// 완독 뱃지. className 으로 위치·크기를 정한다 (예: home-badge, lib-badge, review-badge)
const CompleteBadge = ({ className }) => (
  <span
    className={className}
    style={{
      backgroundColor: "transparent",
      backgroundImage: `url(${badgeImg})`,
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      boxShadow: "none",
    }}
    role="img"
    aria-label="완독"
  />
);

export default CompleteBadge;
