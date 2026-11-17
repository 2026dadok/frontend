import { useEffect, useRef, useState } from "react";
import { fetchTotalXp } from "../home/homeApi";
import xpIcon from "../../images/icon-xp.png";

// 책 검색 페이지 여러 화면에서 같이 쓰는 작은 컴포넌트 모음.

export const SearchBar = ({ value, onChange, onSubmit }) => (
  <form
    className="bs-search"
    role="search"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
  >
    <input
      type="text"
      value={value}
      placeholder="책 제목, 작가로 검색해보세요"
      aria-label="책 검색"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // 한글 조합 중 Enter(글자 확정)로 검색이 실행되지 않게 한다
        if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
      }}
    />
    <button type="submit" aria-label="검색">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="7" />
        <path d="M16 16l5 5" />
      </svg>
    </button>
  </form>
);

// 한 쪽 분량의 목록을 담는 스크롤 영역. 쪽(page)이 바뀌면 맨 위로 올린다.
export const PageArea = ({ className, page, children }) => {
  const rootRef = useRef(null);
  useEffect(() => {
    rootRef.current?.scrollTo({ top: 0 });
  }, [page]);
  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
};

// 쪽 번호 (목록 맨 아래): ‹ 1 2 3 4 5 ›. 5쪽씩 묶어서 보여준다 (1~5, 6~10, ...).
// ‹ › 는 앞·뒤 묶음의 첫 쪽으로 간다.
const BLOCK = 5;
export const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const first = Math.floor((page - 1) / BLOCK) * BLOCK + 1;
  const last = Math.min(first + BLOCK - 1, totalPages);
  const pages = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return (
    <nav className="bs-pages" aria-label="쪽 넘기기">
      <button type="button" className="arrow" aria-label="이전 5쪽" disabled={first === 1} onClick={() => onChange(first - BLOCK)}>
        ‹
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          className={n === page ? "on" : ""}
          aria-current={n === page ? "page" : undefined}
          onClick={() => n !== page && onChange(n)}
        >
          {n}
        </button>
      ))}
      <button type="button" className="arrow" aria-label="다음 5쪽" disabled={last === totalPages} onClick={() => onChange(last + 1)}>
        ›
      </button>
    </nav>
  );
};

export const ListStatus = ({ loading, error, empty, emptyText, onRetry }) => {
  if (loading) return <p className="bs-status">불러오는 중…</p>;
  if (error) {
    return (
      <p className="bs-status">
        불러오지 못했어요.{" "}
        <button type="button" className="bs-link-btn" onClick={onRetry}>
          다시 시도
        </button>
      </p>
    );
  }
  if (empty) return <p className="bs-status">{emptyText}</p>;
  return null;
};

export const Stars = ({ value, size = 16 }) => {
  const filled = Math.round(value);
  return (
    <span className="bs-stars" style={{ fontSize: size }} aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "on" : ""}>★</span>
      ))}
    </span>
  );
};

export const StarInput = ({ value, onChange, size = 26, disabled = false }) => (
  <span className="bs-stars input" style={{ fontSize: size }} role="radiogroup" aria-label="나의 별점">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={n === value}
        aria-label={`${n}점`}
        disabled={disabled}
        className={n <= value ? "on" : ""}
        onClick={() => onChange(n)}
      >
        ★
      </button>
    ))}
  </span>
);

export const Avatar = ({ size = 44 }) => (
  <svg className="bs-avatar" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="32" fill="#cfcfcf" />
    <circle cx="32" cy="25" r="11" fill="#fff" />
    <path d="M10 56c3-12 12-18 22-18s19 6 22 18a32 32 0 0 1-44 0z" fill="#fff" />
  </svg>
);

export const Toast = ({ message }) =>
  message ? (
    <div className="bs-toast" role="status">
      {message}
    </div>
  ) : null;

// 오른쪽 위의 내 전체 XP (아이콘은 숫자와 같은 색으로 칠한다)
export const XpTotal = () => {
  const [totalXp, setTotalXp] = useState("-"); // 불러오기 전·실패하면 "-"
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(fetchTotalXp)
      .then((v) => alive && v != null && setTotalXp(v))
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="bs-xp">
      <i style={{ maskImage: `url(${xpIcon})`, WebkitMaskImage: `url(${xpIcon})` }} aria-hidden="true" />
      <span>{totalXp}</span>
    </div>
  );
};
