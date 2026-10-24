import { ScrollArea, ListStatus } from "./parts";

// 2번 화면: 검색 결과
const SearchResults = ({ results, onOpen, onAddMine, onAddShared }) => {
  const { books, total, loading, error, hasMore, loadMore } = results;
  const stop = (handler) => (e) => {
    e.stopPropagation(); // 카드 전체 클릭(상세 이동)과 겹치지 않게
    handler();
  };

  return (
    <ScrollArea
      className="bs-results-scroll"
      count={books.length}
      canLoad={hasMore && !loading && !error}
      onLoadMore={loadMore}
    >
      <h2 className="bs-results-title">
        {loading && !books.length ? "검색 중…" : `검색 결과 ( ${total} )`}
      </h2>

      {books.map((b) => (
        <article
          key={b.id}
          className="bs-result"
          tabIndex={0}
          onClick={() => onOpen(b)}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && e.key === "Enter") onOpen(b);
          }}
        >
          <img className="bs-result-cover" src={b.cover} alt={b.title} />
          <div className="bs-result-body">
            <h3>
              {b.title}
              {b.authorLine && <> | 저자 {b.authorLine}</>}
            </h3>
            <p className="bs-result-intro">{b.intro || "등록된 책 소개가 없습니다."}</p>
            <span className="bs-result-more">(더보기)</span>
          </div>
          <div className="bs-result-actions">
            <button type="button" className="bs-pill-btn" onClick={stop(() => onOpen(b))}>
              소개 보기
            </button>
            <button type="button" className="bs-pill-btn" onClick={stop(() => onAddMine(b))}>
              나의 서재 추가
            </button>
            <button type="button" className="bs-pill-btn" onClick={stop(() => onAddShared(b))}>
              공동 서재 추가
            </button>
          </div>
        </article>
      ))}

      <ListStatus
        loading={loading && books.length > 0}
        error={error}
        empty={!loading && !books.length}
        emptyText="검색 결과가 없어요."
        onRetry={loadMore}
      />
    </ScrollArea>
  );
};

export default SearchResults;
