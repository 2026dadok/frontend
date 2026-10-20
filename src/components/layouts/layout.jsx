import { Outlet } from "react-router-dom";
import Sidebar from "../sidebars/sidebar";
import "./layout.css";

const Layout = () => (
  <div className="app-layout">
    <Sidebar />
    <main className="app-layout-main">
      <Outlet />
    </main>
  </div>
);

export default Layout;
