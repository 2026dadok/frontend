import "./AuthLayout.css";
import useAuthScale from "./useAuthScale";
import "./AuthCommon.css";
import treeImg from "../../../images/dadoktree.png";
import logoImg from "../../../images/dadokdadok.png"

const AuthLayout = ({children}) => {
    const scale = useAuthScale();
    return (
        <div className="page-background" style={{ "--auth-zoom": scale }}>
            <div className="auth-container">
                <div className="pink_fir"></div>
                <div className="pink_sec"></div>
                <div className="white_fir"></div>
                <div className="white_sec"></div>
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