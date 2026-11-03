import { useEffect, useRef, useState } from "react";
import { Avatar } from "../bookSearch/parts";

// 마이페이지와 회원정보 수정 화면이 같이 쓰는 작은 컴포넌트 모음.

const ICONS = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  book: <path d="M3 6c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5V6zM12 6.5V20" />,
  podium: (
    <>
      <path d="M9 21v-7h6v7M3 21v-4h6M15 17h6v4M2 21h20" />
      <path d="M12 3l1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.3z" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5H4z" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M3 6l9 7 9-7" />
    </>
  ),
  key: (
    <>
      <circle cx="15.5" cy="8.5" r="5" />
      <path d="M11.8 12L3 20.8M6 18l2 2M8.5 15.5l2 2" />
    </>
  ),
  eyeClosed: <path d="M3 10c2.5 3 5.5 4.5 9 4.5S18.5 13 21 10M6 13l-1.5 2.5M12 14.5V17M18 13l1.5 2.5M9 14.2l-.7 2.6M15 14.2l.7 2.6" />,
  eyeOpen: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: <path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />,
  chevron: <path d="M9 5l7 7-7 7" />,
};

export const Icon = ({ name, size = 24, strokeWidth = 1.6, className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICONS[name]}
  </svg>
);

// 초록 동그라미 연필 버튼. 누르면 이미지 파일을 고르고 onPick(file) 을 부른다.
// 이미 바꾼 이미지가 있으면(canReset) 메뉴를 열어 '사진 바꾸기 / 삭제하기' 중에 고른다.
export const ImagePencil = ({ label, className, onPick, canReset = false, onReset }) => {
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // 메뉴 밖을 누르거나 Esc 를 누르면 닫는다
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const pickFile = () => {
    setMenuOpen(false);
    inputRef.current.click();
  };

  return (
    <span ref={wrapRef} className={`mp-pencil-wrap ${className ?? ""}`}>
      <button
        type="button"
        className="mp-pencil"
        aria-label={label}
        aria-expanded={canReset ? menuOpen : undefined}
        onClick={canReset ? () => setMenuOpen(!menuOpen) : pickFile}
      >
        <Icon name="pencil" size={16} strokeWidth={2} />
      </button>
      {menuOpen && (
        <span className="mp-pencil-menu" role="menu">
          <button type="button" role="menuitem" onClick={pickFile}>사진 바꾸기</button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onReset();
            }}
          >
            삭제하기
          </button>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // 같은 파일을 다시 골라도 동작하게
          if (file) onPick(file);
        }}
      />
    </span>
  );
};

// 배경 이미지. 없으면 기본 밤하늘 배경(CSS)
export const Banner = ({ image, className }) => (
  <div
    className={`mp-banner ${image ? "has-image" : ""} ${className ?? ""}`}
    style={image ? { backgroundImage: `url(${image})` } : undefined}
  />
);

export const ProfileImage = ({ image, size }) =>
  image ? (
    <img className="mp-avatar" src={image} alt="프로필 사진" style={{ width: size, height: size }} />
  ) : (
    <span className="mp-avatar">
      <Avatar size={size} />
    </span>
  );
