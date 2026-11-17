import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { Toast } from "../bookSearch/parts";
import { applyTitle, fetchMyPage, formatHours } from "./myPageApi";
import { Banner, Icon, ImagePencil, ProfileImage } from "./parts";
import useProfileImages from "./useProfileImages";
import "../bookSearch/BookSearch.css"; // .bs 버튼·알림 스타일을 같이 쓴다
import "./MyPage.css";

const StatCard = ({ icon, label, value }) => (
  <div className="mp-stat">
    <Icon name={icon} size={50} strokeWidth={1.4} className="mp-stat-icon" />
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  </div>
);

const Achievement = ({ item, onUse }) => {
  const body = (
    <>
      <span className="mp-ach-icon">
        <Icon name="book" size={30} />
      </span>
      <span className="mp-ach-text">
        <strong>
          {item.title}
          {item.achieved && <span className={`mp-badge ${item.used ? "used" : ""}`}>{item.used ? "사용" : "달성"}</span>}
        </strong>
        <span>{item.description}</span>
      </span>
    </>
  );
  // 달성한 업적은 눌러서 사용할 수 있다. 사용 중인 업적은 주간 경쟁 등에서 이름 앞에 붙는다
  return item.achieved && !item.used ? (
    <button type="button" className="mp-ach" title="이 업적 사용하기 (이름 앞에 표시)" onClick={() => onUse(item)}>
      {body}
    </button>
  ) : (
    <div className={`mp-ach ${item.used ? "used" : ""} ${item.achieved ? "" : "locked"}`}>{body}</div>
  );
};

// 마이페이지: 배경·프로필(연필로 바꾸기), 통계, 업적
const MyPage = () => {
  const scale = useFitScale({ fitHeight: false });
  const [data, setData] = useState(null);
  const { images, setImages, changeImage, resetToDefault, toast, showToast } = useProfileImages();

  useEffect(() => {
    let alive = true;
    fetchMyPage().then((result) => {
      if (!alive) return;
      setData(result);
      setImages({ profile: result.profileImage, background: result.backgroundImage });
    });
    return () => {
      alive = false;
    };
  }, [setImages]);

  const chooseTitle = async (item) => {
    if (!(await applyTitle(item.id))) {
      showToast("업적을 바꾸지 못했어요.");
      return;
    }
    setData((prev) => {
      const achieved = prev.achieved
        .map((a) => ({ ...a, used: a.id === item.id }))
        .sort((a, b) => Number(b.used) - Number(a.used));
      return { ...prev, title: item.title, achieved };
    });
    showToast(`'${item.title}' 업적을 사용해요.`);
  };

  return (
    <div className="bs mp">
      <Toast message={toast} />
      <div className="mp-stage" style={{ "--s": scale }}>
        <div className="mp-top">
          <Banner image={images.background} />
          <ImagePencil label="배경 이미지 바꾸기" className="banner" onPick={(file) => changeImage("background", file)} canReset={Boolean(images.background)} onReset={() => resetToDefault("background")} />
        </div>

        {data && (
          <div className="mp-column">
            <div className="mp-profile">
              <ProfileImage image={images.profile} size={139} />
              <ImagePencil label="프로필 사진 바꾸기" className="avatar" onPick={(file) => changeImage("profile", file)} canReset={Boolean(images.profile)} onReset={() => resetToDefault("profile")} />
            </div>
            <h1 className="mp-id">{data.needLogin ? "로그인이 필요해요." : data.failed ? "정보를 불러오지 못했어요." : data.id}</h1>
            <p className="mp-title">
              {data.title && <strong>{data.title} </strong>}
              {data.name}
            </p>

            <Link to={PATHS.mypageEdit} className="mp-edit-link">
              회원정보 수정 <Icon name="chevron" size={16} strokeWidth={2} />
            </Link>

            <section className="mp-section">
              <h2>통계</h2>
              <div className="mp-stats">
                {/* 통계를 불러오지 못했으면(stats 가 null) 0 대신 "-" */}
                <StatCard icon="clock" label="총 독서 시간" value={data.stats ? formatHours(data.stats.minutes) : "-"} />
                <StatCard icon="calendar" label="최대 연속 독서일" value={data.stats ? `${data.stats.streakDays}일` : "-"} />
                <StatCard icon="book" label="총 독서 페이지" value={data.stats ? `${data.stats.pages}p` : "-"} />
                <StatCard icon="podium" label="경쟁 5위권 진입 횟수" value={data.stats ? `${data.stats.top5Count}회` : "-"} />
              </div>
            </section>

            <section className="mp-section">
              <h2>업적</h2>
              <div className="mp-achs">
                {data.achieved.map((item) => (
                  <Achievement key={item.id} item={item} onUse={chooseTitle} />
                ))}
              </div>
              {data.achieved.length > 0 && data.locked.length > 0 && <hr className="mp-ach-divider" />}
              {data.achieved.length === 0 && data.locked.length === 0 && (
                <p className="mp-ach-empty">{data.needLogin ? "로그인하면 업적을 볼 수 있어요." : data.failed ? "업적을 불러오지 못했어요." : "아직 업적이 없어요."}</p>
              )}
              <div className="mp-achs">
                {data.locked.map((item) => (
                  <Achievement key={item.id} item={item} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;
