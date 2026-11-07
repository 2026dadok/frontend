import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MS = 2000;

// 잠깐 떴다 사라지는 알림 문구. const [toast, showToast] = useToast(); 처럼 쓴다.
// 화면에는 <Toast message={toast} /> 로 보여준다. 새 알림이 오면 이전 타이머를 지워서 일찍 사라지지 않게 한다.
const useToast = () => {
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback((message, ms = DEFAULT_MS) => {
    clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(""), ms);
  }, []);

  return [toast, showToast];
};

export default useToast;
