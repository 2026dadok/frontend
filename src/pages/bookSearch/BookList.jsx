import { ListStatus, PageArea, Pagination } from "./parts";
import { GENRE_OPTIONS } from "./genres";
import mascotImg from "../../images/v.png";
import askImg from "../../images/da-question.png";

// 1번 화면: 베스트셀러 목록. 한 쪽에 4줄 × 5칸(20권)씩, 아래 쪽 번호로 넘긴다
const BookList = ({ list, genre, onGenreChange, onOpen }) => {
  const { books, page, totalPages, loading, error, goTo, retry } = list;
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

      <PageArea className="bs-list-scroll" page={page}>
        <div className="bs-grid">
          {!loading && books.map((b) => (
            <button key={b.id} type="button" className="bs-grid-book" onClick={() => onOpen(b)}>
              <img src={b.cover} alt="" />
              <span className="bs-grid-title">{b.title}</span>
            </button>
          ))}
        </div>
        <ListStatus
          loading={loading}
          error={error}
          empty={!loading && !books.length}
          emptyText="책 목록이 비어 있어요."
          onRetry={retry}
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={goTo} />}
      </PageArea>

      {/* 책 목록 왼쪽 빈 곳의 브이 하는 독따지. 꾸밈용이라 화면 읽기 프로그램은 건너뛴다 */}
      <div className="bs-list-mascot" aria-hidden="true">
        <img src={mascotImg} alt="" />
      </div>
      {/* 책 목록 오른쪽 빈 곳의 갸웃하는 그림 (꾸밈용) */}
      <div className="bs-list-ask" aria-hidden="true">
        <img src={askImg} alt="" />
      </div>
    </>
  );
};

export default BookList;
