// 주간 경쟁 화면에서 쓰는 데이터.
// 명세서(ver02): GET /main/week_competition → tier, competitors_books, my_rank, ranking, reading_book, last_week_result
// 명세서에 각 항목 안의 필드 이름이 없어서, 아래 normalize 함수들이 여러 이름을 받아 화면용 형태로 맞춘다.
// TODO: 백엔드가 필드 이름을 정하면 normalize 함수의 후보 이름을 그것 하나로 줄인다.
// TODO: 읽은 시간 단위(분/초)는 백엔드와 확인. 지금은 분으로 본다. (독서 시간 저장 POST /times 와 같은 단위)

import { searchBooks } from "../bookSearch/bookSearchApi";
import { getMe } from "../bookSearch/bookStore";

const COMPETITOR_BOOKS_MAX = 5;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

const pick = (obj, ...names) => names.map((n) => obj?.[n]).find((v) => v != null && v !== "");
const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

// 순위 한 줄: { rank, name, title, minutes, image, me }
const toRanker = (raw, me = false) => ({
  rank: toNumber(pick(raw, "rank", "ranking", "my_rank")) || null, // 0 이나 값 없음은 "-위"
  name: pick(raw, "name", "user_name", "nickname", "ID") ?? "",
  title: pick(raw, "title", "title_name", "user_title") ?? "", // 칭호 (예: 스테디셀러)
  minutes: toNumber(pick(raw, "reading_time", "readtime", "week_readtime", "minutes")) ?? 0,
  image: pick(raw, "profile_image", "profileimage", "image", "imageurl") ?? "",
  me,
});

// 책: 백엔드는 ISBN 만 주고 표지·제목은 YES24 에서 찾는다. 백엔드가 표지를 같이 주면 그대로 쓴다.
const isbnOf = (raw) => String(typeof raw === "object" ? pick(raw, "isbn", "ISBN") ?? "" : raw ?? "").trim();

const findBookByIsbn = async (isbn) => {
  if (!isbn) return null;
  try {
    const { books } = await searchBooks(isbn, 1);
    return books[0] ?? null;
  } catch {
    return null;
  }
};

const withCover = async (raw) => {
  const cover = pick(raw, "cover_url", "cover");
  if (cover) return { ...raw, cover, title: pick(raw, "title") ?? "" };
  const found = await findBookByIsbn(isbnOf(raw));
  return found ? { ...found, ...(typeof raw === "object" ? raw : {}), cover: found.cover, title: found.title } : null;
};

const loadCompetitorBooks = async (list) => {
  const items = Array.isArray(list) ? list.slice(0, COMPETITOR_BOOKS_MAX) : [];
  const books = await Promise.all(items.map(withCover));
  return books.filter((b) => b?.cover);
};

// 오른쪽 카드: 나의 서재에서 최근에 읽고 있는 책. { id, title, cover, readPage, totalPage, percent }
const loadReadingBook = async (raw) => {
  if (!raw) return null;
  const book = await withCover(raw);
  if (!book) return null;
  const readPage = toNumber(pick(raw, "read_page", "read_pages", "readPage")) ?? 0;
  const totalPage = toNumber(pick(raw, "total_page", "total_pages", "pages", "totalPage")) ?? toNumber(book.pages) ?? 0;
  const percent = toNumber(pick(raw, "percent")) ?? (totalPage ? Math.round((readPage / totalPage) * 100) : 0);
  return {
    ...book,
    id: String(pick(raw, "book_id", "bookID", "id") ?? book.id ?? ""),
    readPage,
    totalPage,
    percent: Math.max(0, Math.min(100, percent)),
  };
};

// 지난주 결과: { rank, xp } 또는 null
const toLastWeek = (raw) => {
  const rank = toNumber(pick(raw, "rank", "my_rank", "ranking"));
  if (!rank) return null;
  return { rank, xp: toNumber(pick(raw, "reward_xp", "xp", "gained_xp")) ?? 0 };
};

// TODO: 백엔드 연결 후 삭제. 백엔드가 없거나 실패했을 때 화면 확인용으로 보여주는 임시값 (응답과 같은 형태)
const MOCK_COMPETITION = {
  tier: "동",
  competitors_books: ["9791141691370", "9791122092240", "9791199489561", "9788937460586", "9791124073483"],
  my_rank: { rank: 12, title: "베스트셀러", reading_time: 637 },
  ranking: [
    { rank: 1, name: "최지수", title: "어느날 갑자기", reading_time: 8292 },
    { rank: 2, name: "강효제", title: "스테디셀러", reading_time: 1389 },
    { rank: 3, name: "임상혁", title: "완독의 맛", reading_time: 1123 },
    { rank: 4, name: "김래현", title: "주경야독", reading_time: 1025 },
    { rank: 5, name: "김지후", title: "꿈이 끝나는", reading_time: 924 },
    { rank: 6, name: "이하랑", title: "목차 탈출 성공", reading_time: 672 },
  ],
  reading_book: { isbn: "9788936434120", read_page: 148, total_page: 312 },
  last_week_result: { rank: 12, reward_xp: 90 },
};

const requestCompetition = async () => {
  try {
    const res = await fetch("/main/week_competition", { headers: authHeaders() });
    if (!res.ok) return MOCK_COMPETITION;
    const json = await res.json();
    return json?.data ?? json;
  } catch {
    return MOCK_COMPETITION; // 서버가 없거나 응답이 JSON 이 아닐 때
  }
};

export const fetchWeekCompetition = async () => {
  const data = await requestCompetition();
  const [competitorBooks, readingBook] = await Promise.all([
    loadCompetitorBooks(data.competitors_books),
    loadReadingBook(data.reading_book),
  ]);
  const tier = data.tier;
  const myRank = typeof data.my_rank === "object" ? data.my_rank : { rank: data.my_rank }; // 숫자만 올 수도 있다
  return {
    tier: (typeof tier === "object" ? pick(tier, "name", "tier") : tier) ?? "",
    competitorBooks,
    me: toRanker({ name: getMe().displayName, ...myRank }, true),
    ranking: (Array.isArray(data.ranking) ? data.ranking : []).map((r) => toRanker(r)),
    readingBook,
    lastWeek: toLastWeek(data.last_week_result),
  };
};

// 이번 주(월요일 0시 시작)를 나타내는 값. 지난주 결과 알림을 한 주에 한 번만 띄우는 데 쓴다.
export const currentWeekKey = () => {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toLocaleDateString("sv-SE"); // yyyy-MM-dd
};

export const formatMinutes = (minutes) => `${Math.floor(minutes / 60)}시간 ${Math.round(minutes % 60)}분`;
