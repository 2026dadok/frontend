import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ensureAttendance } from "../../api/attendance";
import XpToast from "../xpToast/XpToast";
import Sidebar from "../sidebars/sidebar";
import "./layout.css";

const Layout = () => {
  
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
