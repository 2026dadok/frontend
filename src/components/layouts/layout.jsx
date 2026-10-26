import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ensureAttendance } from "../../api/attendance";
import XpToast from "../xpToast/XpToast";
import Sidebar from "../sidebars/sidebar";
import "./layout.css";

const Layout = () => {
  // 어느 페이지로 들어와도 오늘 첫 방문이면 출석을 보내고 XP 알림창을 띄운다
  useEffect(() => {
    ensureAttendance();
  }, []);

  return (
    <div className="app-layout">
      <XpToast />
      <Sidebar />
      <main className="app-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
