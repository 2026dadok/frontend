import badgeImg from "../images/wandok.png";

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
