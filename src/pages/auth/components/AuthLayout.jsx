import "./AuthLayout.css";
import useAuthScale from "./useAuthScale";
import "./AuthCommon.css";
import treeImg from "../../../images/dadoktree.png";
import logoImg from "../../../images/dadokdadok.png"
import backIcon from "../../../images/back.png";

// onBack 을 주면 카드 왼쪽 위에 뒤로 가기 버튼이 생긴다
const AuthLayout = ({ children, onBack }) => {
    const scale = useAuthScale();
    return (
        <div className="page-background" style={{ "--auth-zoom": scale }}>
            <div className="auth-container">
                <div className="pink_fir"></div>
                <div className="pink_sec"></div>
                <div className="white_fir"></div>
                <div className="white_sec"></div>
                {onBack && (
                    <button type="button" className="auth-back" aria-label="뒤로 가기" onClick={onBack}>
                        <img src={backIcon} alt="" />
                    </button>
                )}
                <div className="auth-picture">
                    <img src={treeImg} alt="나무 그림" />
                </div>
                <div className="auth-logo">
                    <img src={logoImg} alt="logo"/>
                </div>
                <div className="auth-content">
                    {children}
                </div>
            </div>
        </div>
        
    )
}

export default AuthLayout;