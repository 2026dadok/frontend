import { ScrollArea, ListStatus } from "./parts";
import { GENRE_OPTIONS } from "./genres";

// 1번 화면: 베스트셀러 목록
const BookList = ({ list, genre, onGenreChange, onOpen }) => {
  const { books, loading, error, hasMore, loadMore } = list;
  return (
    <>
      <div className="bs-sort">
        <select aria-label="장르" value={genre} onChange={(e) => onGenreChange(e.target.value)}>
          {GENRE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <ScrollArea
        className="bs-list-scroll"
        count={books.length}
        canLoad={hasMore && !loading && !error}
        onLoadMore={loadMore}
      >
        <div className="bs-grid">
          {books.map((b) => (
            <button key={b.id} type="button" className="bs-grid-book" onClick={() => onOpen(b)}>
              <img src={b.cover} alt={b.title} />
            </button>
          ))}
        </div>
        <ListStatus
          loading={loading}
          error={error}
          empty={!books.length && !hasMore}
          emptyText="책 목록이 비어 있어요."
          onRetry={loadMore}
        />
      </ScrollArea>
    </>
  );
};

export default BookList;
