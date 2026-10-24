import { useCallback, useEffect, useRef, useState } from "react";

// loadPage(page) → { books, total, hasMore } 를 받아 쌓아 두는 무한 스크롤용 훅.
// loadPage 가 바뀌면(예: 검색어 변경) 처음부터 다시 불러온다.
const useInfiniteBooks = (loadPage) => {
  const [state, setState] = useState({
    books: [],
    total: 0,
    hasMore: true,
    loading: false,
    error: false,
  });
  const pageRef = useRef(0);
  const busyRef = useRef(false);
  const generationRef = useRef(0); // loadPage 가 바뀌면 늦게 도착한 이전 응답을 버리기 위한 번호

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const generation = generationRef.current;
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const nextPage = pageRef.current + 1;
      const result = await loadPage(nextPage);
      if (generation !== generationRef.current) return;
      pageRef.current = nextPage;
      setState((s) => {
        const seen = new Set(s.books.map((b) => b.id));
        return {
          books: [...s.books, ...result.books.filter((b) => !seen.has(b.id))],
          total: result.total,
          hasMore: result.hasMore,
          loading: false,
          error: false,
        };
      });
    } catch (e) {
      if (generation !== generationRef.current) return;
      console.error(e);
      setState((s) => ({ ...s, loading: false, error: true }));
    } finally {
      if (generation === generationRef.current) busyRef.current = false;
    }
  }, [loadPage]);

  useEffect(() => {
    generationRef.current += 1;
    pageRef.current = 0;
    busyRef.current = false;
    Promise.resolve().then(() => {
      setState({ books: [], total: 0, hasMore: true, loading: false, error: false });
      loadMore();
    });
  }, [loadMore]);

  return { ...state, loadMore };
};

export default useInfiniteBooks;
