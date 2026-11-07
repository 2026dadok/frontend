import { useEffect } from "react";

// Esc 를 누르면 onClose 를 부른다. 팝업을 닫을 때 쓴다.
const useEscape = (onClose) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
};

export default useEscape;
