// 책의 큰 장르 분류와, 책 검색 1번 화면의 장르 선택 목록.
//
// YES24 책 데이터에는 "국내도서-소설/시/희곡", "에세이", "경제 경영" 같은 큰 분류만 있고
// 로맨스·판타지 같은 세부 장르는 없다. 그래서 소설은 제목과 책 소개 글에 나오는 단어로 장르를 가린다.

// 소설 장르별 단서 단어. 서로 다른 단어가 2개 이상 나오거나, 제목에 나오면 그 장르로 본다.
// (소설에서 '사랑' 같은 흔한 단어는 오판이 많아서 뺐다)
const NOVEL_KEYWORDS = {
  로맨스: ["로맨스", "연애", "연인", "첫사랑", "짝사랑", "설렘", "이별", "고백", "결혼"],
  판타지: ["판타지", "마법", "마왕", "용사", "이세계", "환생", "회귀", "던전", "드래곤", "마녀", "요정"],
  "추리/미스터리": ["추리", "미스터리", "탐정", "살인", "범인", "형사", "수사", "범죄", "스릴러"],
  SF: ["SF", "우주", "외계", "로봇", "인공지능", "디스토피아", "시간여행", "AI"],
};

const NOVEL_CATEGORY = "소설/시/희곡"; // YES24 큰 분류 이름

const countKeywords = (words, text) => words.filter((word) => text.includes(word)).length;

// 책 한 권의 큰 장르를 정한다. 서재의 분류 필터에 쓴다.
//   rawCategory: YES24 큰 분류 ("소설/시/희곡", "에세이", "경제 경영" …)
export const classifyGenre = ({ rawCategory, title = "", intro = "" }) => {
  if (!rawCategory) return "";
  if (rawCategory !== NOVEL_CATEGORY) return rawCategory;
  if (/시집|희곡/.test(title)) return "시/희곡";

  let best = "";
  let bestScore = 0;
  Object.entries(NOVEL_KEYWORDS).forEach(([genre, words]) => {
    const inTitle = countKeywords(words, title) > 0;
    const score = countKeywords(words, `${title} ${intro}`) + (inTitle ? 1 : 0);
    if (score >= 2 && score > bestScore) {
      best = genre;
      bestScore = score;
    }
  });
  return best || "소설";
};

// 책 검색 1번 화면의 장르 선택. categoryId 는 YES24 카테고리 베스트셀러, query 는 검색(소설만 남김).
// 로맨스·판타지·추리·SF 는 YES24에 해당 카테고리가 없어서 검색 결과에서 소설만 골라 보여준다. (판매 순위는 아님)
export const GENRE_OPTIONS = [
  { value: "bestseller", label: "베스트셀러순", categoryId: "001" },
  { value: "소설", label: "소설", categoryId: "001001046" },
  { value: "로맨스", label: "로맨스", query: "로맨스 소설" },
  { value: "판타지", label: "판타지", query: "판타지 소설" },
  { value: "추리/미스터리", label: "추리/미스터리", query: "추리 소설" },
  { value: "SF", label: "SF", query: "SF 소설" },
  { value: "에세이", label: "에세이", categoryId: "001001047" },
  { value: "시/희곡", label: "시/희곡", categoryId: "001001046014" },
  { value: "인문", label: "인문", categoryId: "001001019" },
  { value: "역사", label: "역사", categoryId: "001001010" },
  { value: "경제 경영", label: "경제 경영", categoryId: "001001025" },
  { value: "자기계발", label: "자기계발", categoryId: "001001026" },
];

export const NOVEL_RAW_CATEGORY = NOVEL_CATEGORY;
