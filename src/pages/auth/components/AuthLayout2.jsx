import "./AuthLayout2.css";
import useAuthScale from "./useAuthScale";
import dokddageImg from "../../../images/dokddage.png"

const AuthLayout2 = ({ children, footer }) => {
    const scale = useAuthScale();
    return (
        <div className="page-background" style={{ "--auth-zoom": scale }}>
            <div className="pinkLayer">
                <div className="dokddage">
                        <img src={dokddageImg} alt="타이머독따지"/>
                    </div>
                <div className="whiteLayer">
                    
                    <div className="content-area">
                        {children}
                    </div>
                    {footer}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout2;