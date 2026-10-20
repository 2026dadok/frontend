import { NavLink } from "react-router-dom";
import { PATHS } from "../../routes";
import "./sidebar.css";

import logoImg from "../../images/logo.png";
import mypageIcon from "../../images/icon-mypage.png";
import homeIcon from "../../images/icon-home.png";
import rankIcon from "../../images/icon-rank.png";
import searchIcon from "../../images/icon-search.png";
import libraryIcon from "../../images/icon-library.png";
import settingsIcon from "../../images/icon-settings.png";

const MENUS = [
  { label: "마이페이지", to: PATHS.mypage, icon: mypageIcon },
  { label: "홈", to: PATHS.main, icon: homeIcon },
  { label: "주간 경쟁", to: PATHS.rank, icon: rankIcon },
  { label: "책 검색", to: PATHS.search, icon: searchIcon },
  { label: "서고", to: PATHS.library, icon: libraryIcon },
];

const linkClass = ({ isActive }) =>
  isActive ? "sidebar-item active" : "sidebar-item";

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <NavLink to={PATHS.main} className="sidebar-logo">
        <img src={logoImg} alt="로고" />
      </NavLink>

      <nav className="sidebar-menu">
        {MENUS.map((m) => (
          <NavLink key={m.to} to={m.to} className={linkClass}>
            <img src={m.icon} alt="" />
            <span>{m.label}</span>
          </NavLink>
        ))}
      </nav>

      <NavLink to={PATHS.settings} className="sidebar-settings" aria-label="설정">
        <img src={settingsIcon} alt="" />
      </NavLink>
    </aside>
  );
};

export default Sidebar;