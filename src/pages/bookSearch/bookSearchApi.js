// 책 검색 페이지에서 쓰는 YES24 Open API 호출 모음.
// 키는 .env.local 의 YES24_API_KEY → vite.config.js 프록시(/yes24)가 X-Api-Key 헤더로 붙인다.
// 문서: https://developers.yes24.com/api-doc/ (category-bestseller-monthly, goods-item-list)

import { classifyGenre, GENRE_OPTIONS, NOVEL_RAW_CATEGORY } from "./genres";

const YES24 = "/yes24/v1";
const YES24_BOOK_CATEGORY_ID = "001"; // 국내도서 (홈 추천도서와 동일)
const PAGE_SIZE = 20;
const OTHER_WORKS_LIMIT = 4;

// 책 소개 글에 섞여 올 수 있는 HTML 태그/엔티티를 걷어낸다 (화면에는 순수 텍스트만 쓴다)
const cleanText = (text) =>
  String(text ?? "") // YES24 가 소개를 null 로 줄 때가 있다. String(null) 은 "null" 글자가 된다
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// YES24 저자 문자열 예: "무라카미 하루키 저/홍은주 역", "오다 에이치로 글,그림",
// "김난도,전미영,... 저", "흔한남매 원저/백난도 글/유난희 그림/흔한컴퍼니 감수"
// "/" 로 역할별 묶음이 나뉘고, 묶음 끝의 역할 단어(저, 역 …)가 그 묶음 전체의 역할이다.
const CREATOR_ROLES = ["지음", "저자", "공저", "원저", "편저", "원작", "만화", "글", "그림", "저"];
const TRANSLATOR_ROLES = ["옮김", "번역", "편역", "역"];
const OTHER_ROLES = ["감수", "엮음", "해설", "편"]; // 저자로도 번역가로도 표시하지 않는다
const ALL_ROLES = [...CREATOR_ROLES, ...TRANSLATOR_ROLES, ...OTHER_ROLES];
const ROLE_SUFFIX = new RegExp(`\\s+(${ALL_ROLES.join("|")})$`);
const ROLE_ONLY = new RegExp(`^(${ALL_ROLES.join("|")})$`);

const parseAuthors = (author = "") => {
  const creators = [];
  const translators = [];
  String(author)
    .split(/[/／]/)
    .forEach((segment) => {
      const tokens = segment.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      // "오다 에이치로 글,그림" 처럼 끝에 역할 단어만 따로 오는 토큰은 버린다
      while (tokens.length > 1 && ROLE_ONLY.test(tokens[tokens.length - 1])) tokens.pop();
      if (!tokens.length) return;
      const role = tokens[tokens.length - 1].match(ROLE_SUFFIX)?.[1] ?? "";
      const names = tokens.map((t) => t.replace(ROLE_SUFFIX, "").trim()).filter(Boolean);
      if (!role || CREATOR_ROLES.includes(role)) creators.push(...names); // 역할이 없으면 저자로 본다
      else if (TRANSLATOR_ROLES.includes(role)) translators.push(...names);
    });
  return { creators: [...new Set(creators)], translators: [...new Set(translators)] };
};

const MAX_SHOWN_AUTHORS = 3;
const MAX_AUTHOR_LINE = 22; // 번역가까지 붙인 한 줄이 이보다 길면 번역가는 뺀다

// 화면에 보여줄 저자 문자열: 많으면 "첫 저자 외 N명"
const formatCreators = (names) =>
  names.length > MAX_SHOWN_AUTHORS
    ? `${names[0]} 외 ${names.length - 1}명`
    : names.join(", ");

// YES24 분류 "국내도서-소설/시/희곡" → "소설/시/희곡"
const toRawCategory = (sortName = "") => {
  const part = String(sortName).split("-")[1] ?? String(sortName);
  return part.trim();
};

// 화면에서는 이 형태만 쓴다.
const toBook = (item) => {
  const rawCategory = toRawCategory(item.goodsSortNm);
  const intro = cleanText(item.contentDetail?.bookIntroduction || item.contentDetail?.bookSummary);
  const { creators, translators } = parseAuthors(item.author);
  const author = formatCreators(creators); // 저자만 (서재 저장·"~ 지음" 표기용)
  const withTranslator = translators.length ? `${author} (옮김 ${formatCreators(translators)})` : author;
  return {
    id: String(item.itemId),
    title: item.title ?? "",
    author,
    authorLine: withTranslator.length <= MAX_AUTHOR_LINE ? withTranslator : author, // 목록·상세 표시용
    authorNames: creators, // 저자 일치 판단용 (번역가 제외)
    mainAuthor: creators[0] ?? "",
    publisher: item.publisher ?? "",
    rawCategory,
    genre: classifyGenre({ rawCategory, title: item.title ?? "", intro }), // 큰 장르(서재 분류용)
    cover: item.cover || undefined, // 표지가 없으면 src 를 빈 글자로 두지 않는다 (빈 src 는 페이지를 다시 요청한다)
    intro,
    pages: item.pages ?? null, // detail=Y 일 때만 내려온다. 없으면 null
    link: item.link ?? "",
    isbn: item.isbn13 ?? item.isbn ?? undefined, // 서재·공동서재 등록 때 같은 책을 찾는 기준
  };
};

// 404(BEST_001, SEARCH_001 등 결과 없음)는 에러가 아니라 빈 결과로 본다.
const getJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) }); // 10초 안에 답이 없으면 실패
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
};

const toPage = (json) => {
  const data = json?.data;
  const items = data?.items ?? [];
  return {
    books: items.filter((item) => item.adultYn !== "Y").map(toBook),
    total: data?.totalCount ?? items.length,
  };
};

// 1번 화면: 월별 베스트셀러
export const fetchBestsellers = async (page = 1, categoryId = YES24_BOOK_CATEGORY_ID) => {
  const params = new URLSearchParams({
    categoryId,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    detail: "Y",
  });
  return toPage(await getJson(`${YES24}/category/bestsellerMonthly?${params}`));
};

// 2번 화면: 책 제목/작가 검색 (상품 검색 API)
export const searchBooks = async (query, page = 1) => {
  const params = new URLSearchParams({
    query,
    category: "BOOK",
    page: String(page),
    pageSize: String(PAGE_SIZE),
    detail: "Y",
  });
  return toPage(await getJson(`${YES24}/goods/itemList?${params}`));
};

// 1번 화면: 장르별 인기 책.
// 카테고리가 있는 장르(에세이, 인문 …)는 그 카테고리의 월별 베스트셀러,
// 로맨스·판타지처럼 카테고리가 없는 장르는 검색 결과에서 소설만 남긴다.
export const fetchGenreBooks = async (genre, page = 1) => {
  const option = GENRE_OPTIONS.find((g) => g.value === genre) ?? GENRE_OPTIONS[0];
  if (option.query) {
    const result = await searchBooks(option.query, page);
    return { ...result, books: result.books.filter((b) => b.rawCategory === NOVEL_RAW_CATEGORY) };
  }
  return fetchBestsellers(page, option.categoryId);
};

// 3번 화면: 이 작가의 다른 작품
// YES24에 "저자별 도서" API가 없어서, 저자명으로 상품 검색을 한 뒤 같은 저자의 책만 남긴다.
const SET_TITLE = /세트|패키지|전집|박스/;
// "(30만 부 기념 개정판)" 같은 괄호 부분을 뺀 제목 (판본이 다른 같은 책을 한 권으로 보기 위해)
const baseTitle = (title) => title.replace(/\(.*?\)|\[.*?\]/g, "").replace(/\s+/g, " ").trim();

export const fetchAuthorOtherBooks = async (book) => {
  if (!book.mainAuthor) return [];
  const { books } = await searchBooks(book.mainAuthor, 1);
  const current = baseTitle(book.title);
  const seenTitles = new Set([current]);
  return books
    .filter((b) => b.id !== book.id && b.authorNames.includes(book.mainAuthor))
    .filter((b) => !SET_TITLE.test(b.title) && !b.title.includes(book.title)) // 세트, 지금 책이 들어간 묶음 제외
    .filter((b) => {
      const key = baseTitle(b.title);
      if (seenTitles.has(key)) return false; // 같은 책의 다른 판본 제외
      seenTitles.add(key);
      return true;
    })
    .slice(0, OTHER_WORKS_LIMIT);
};

// 서재에 소개가 저장되지 않은 책(소개 저장 기능이 생기기 전에 담은 책)의 소개를 YES24에서 다시 찾는다.
export const fetchBookIntro = async (book) => {
  const { books } = await searchBooks(book.title, 1);
  return books.find((b) => b.id === book.id)?.intro ?? "";
};
