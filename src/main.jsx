import { createRoot } from 'react-dom/client'
import "./global.css";
import App from './App.jsx'
import { installUiScale } from './hooks/uiScale'

installUiScale(); // 큰 모니터에서 화면 전체를 키우는 배율(--ui)

createRoot(document.getElementById('root')).render(
    <App />
)
