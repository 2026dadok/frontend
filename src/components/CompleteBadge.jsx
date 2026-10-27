// 완독 뱃지. src/images/wandok.png 파일이 있으면 그 이미지로, 없으면 노란 원에 "완독" 글자로 보여준다.
// (파일이 없어도 빌드가 깨지지 않도록 import.meta.glob 으로 있는지 확인한다)
const badgeFiles = import.meta.glob("../images/wandok.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const badgeUrl = Object.values(badgeFiles)[0];

// className 으로 위치·크기를 정한다 (예: home-badge, lib-badge, review-badge)
const CompleteBadge = ({ className }) => (
  <span
    className={className}
    style={
      badgeUrl
        ? {
            backgroundColor: "transparent",
            backgroundImage: `url(${badgeUrl})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            color: "transparent",
            boxShadow: "none",
          }
        : undefined
    }
    role="img"
    aria-label="완독"
  >
    {badgeUrl ? "" : "완독"}
  </span>
);

export default CompleteBadge;
