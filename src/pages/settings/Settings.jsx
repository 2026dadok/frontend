import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import { isLoggedIn } from "../../api/client";
import { logout, withdraw } from "../../api/auth";
import "./Settings.css";

// 설정: 계정(정보 수정·로그아웃·탈퇴)과 약관 링크를 모아 둔다.
const Settings = () => {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const signOut = async () => {
    await logout();
    navigate(PATHS.guest, { replace: true });
  };

  const leave = async () => {
    if (!window.confirm("정말 탈퇴할까요?\n탈퇴하면 이 계정으로 다시 로그인할 수 없어요.")) return;
    if (!(await withdraw())) {
      alert("탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    navigate(PATHS.guest, { replace: true });
  };

  return (
    <div className="st">
      <h1 className="st-title">설정</h1>

      <section className="st-card">
        <h2>계정</h2>
        {loggedIn ? (
          <>
            <Link className="st-row" to={PATHS.mypageEdit}>
              내 정보 수정 <span aria-hidden="true">›</span>
            </Link>
            <button type="button" className="st-row" onClick={signOut}>
              로그아웃
            </button>
            <button type="button" className="st-row danger" onClick={leave}>
              회원탈퇴
            </button>
          </>
        ) : (
          <Link className="st-row" to={PATHS.login}>
            로그인하기 <span aria-hidden="true">›</span>
          </Link>
        )}
      </section>

      <section className="st-card">
        <h2>약관 및 정책</h2>
        <Link className="st-row" to={PATHS.terms}>
          이용약관 <span aria-hidden="true">›</span>
        </Link>
        <Link className="st-row" to={PATHS.privacy}>
          개인정보 처리방침 <span aria-hidden="true">›</span>
        </Link>
      </section>
    </div>
  );
};

export default Settings;
