import { useCallback, useEffect, useRef, useState } from "react";

// 한 쪽에 20권(4줄 × 5칸)씩 넘겨 보는 목록. loadPage(page) → { books, total } (YES24 는 한 번에 20권을 준다)
// loadPage 가 바뀌면(예: 검색어·장르 변경) 1쪽부터 다시 불러온다.
const BOOKS_PER_PAGE = 20;

const usePagedBooks = (loadPage) => {
  const [state, setState] = useState({ page: 1, books: [], total: 0, loading: false, error: false });
  const requestRef = useRef(0); // 늦게 도착한 이전 요청의 응답을 버리기 위한 번호

  const goTo = useCallback(
    async (page) => {
      const request = ++requestRef.current;
      setState((s) => ({ ...s, page, loading: true, error: false }));
      try {
        const result = await loadPage(page);
        if (request !== requestRef.current) return;
        setState({ page, books: result.books, total: result.total, loading: false, error: false });
      } catch (e) {
        if (request !== requestRef.current) return;
        console.error(e);
        setState((s) => ({ ...s, books: [], loading: false, error: true }));
      }
    },
    [loadPage]
  );

  useEffect(() => {
    Promise.resolve().then(() => goTo(1));
  }, [goTo]);

  const totalPages = Math.max(1, Math.ceil(state.total / BOOKS_PER_PAGE));
  return { ...state, totalPages, goTo, retry: () => goTo(state.page) };
};

export default usePagedBooks;
