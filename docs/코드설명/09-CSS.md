# 9장. CSS

CSS는 한 줄씩이 아니라 **파일별 역할과 자주 나오는 기법** 중심으로 설명할게요.

## 앞글자 규칙

CSS는 앱 전체에 적용돼요. 그래서 파일마다 앞글자를 정했어요.

| 앞글자 | 파일 | 화면 |
|---|---|---|
| `ld-` | `Landing.css` | 첫 화면, 푸터 |
| `lg-` | `Legal.css` | 약관 |
| `home-` | `Home.css` | 홈 |
| `bs-` | `BookSearch.css` | 책 검색 + 공통 틀 |
| `lib-` | `Library.css` | 서고 |
| `shared-` | `SharedLibraryPage.css` | 공동서재 |
| `review-` | `Review.css` | 감상문 |
| `quote-` | `Quote.css` | 인용구 |
| `rk-` | `WeeklyRank.css` | 주간 경쟁 |
| `mp-`, `ei-` | `MyPage.css` | 마이페이지, 회원정보 수정 |
| `tm-` | `Timer.css` | 타이머 |
| `xp-` | `XpToast.css` | XP 알림 |

`BookSearch.css`의 `.bs`, `.bs-stage`, `.bs-canvas`, `.bs-toast`, `.bs-xp`는 다른 화면도 같이 써요. 그래서 다른 화면에도 `import "../bookSearch/BookSearch.css"`가 있어요.

## 화면 틀 세 겹

대부분의 화면이 이 구조예요.

```html
<div class="bs">            <!-- 화면 전체 (100vh, 스크롤 없음) -->
  <div class="bs-stage">    <!-- 비율대로 줄이는 칸 (zoom) -->
    <div class="bs-canvas"> <!-- 디자인 크기(1419px) 판. 안의 요소를 px 로 배치 -->
```

```css
.bs-stage {
  zoom: var(--s, 1);                              /* 자바스크립트가 넣어 준 비율. 없으면 1 */
  width: calc((100vw - 103px) / var(--s, 1));     /* 줄어든 만큼 너비를 키워서 꽉 차게 */
  height: calc(100vh / var(--s, 1));
}
```

- `var(--s, 1)`: CSS 변수 `--s`를 읽어요. 없으면 1이에요.
- `calc()`: 계산식이에요.
- `100vw`, `100vh`: 창 전체 너비, 높이예요.

## 배치 방법 세 가지

### 1. Flex: 한 줄로 늘어놓기

```css
.lib-head { display: flex; align-items: center; gap: 9px; }
```
- `display: flex`: 자식을 가로로 늘어놓아요. (`flex-direction: column`이면 세로)
- `align-items: center`: 수직 가운데
- `justify-content`: 가로 정렬 (`center`, `space-between` 등)
- `gap`: 사이 간격
- `flex: 1`: 남는 공간을 차지해요
- `flex: none`: 크기를 유지해요

### 2. Grid: 격자

```css
.mp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
```
- `1fr 1fr`: 같은 너비로 두 칸이에요.
- `repeat(53, minmax(0, 1fr))`: 53칸. 독서 달력에 써요.
- `grid-auto-flow: column`: 위에서 아래로 채워요. 달력이 세로로 채워지는 이유예요.
- `grid-area: 1 / 1`: 여러 요소를 같은 칸에 겹쳐요. 홈 말풍선의 기본·호버 내용이에요.

### 3. Absolute: 좌표로 정확히

```css
.rk-card { position: absolute; }
.rk-ranking { left: 129px; top: 364px; width: 838px; height: 588px; }
```
부모(`position: relative`) 기준으로 좌표를 찍어요. 디자인을 픽셀 그대로 옮길 때 써요. 주간 경쟁과 서고가 이 방식이에요.

## position 정리

| 값 | 기준 | 예시 |
|---|---|---|
| `relative` | 자기 자리. 자식 absolute의 기준 | `.bs-canvas` |
| `absolute` | 가장 가까운 relative 부모 | 대부분의 카드 |
| `fixed` | 화면 자체. 스크롤해도 고정 | 사이드바, 저장하기 버튼 |
| `sticky` | 스크롤하다 닿으면 붙음 | 첫 화면 머리말 |

## 자주 나오는 기법

### 글이 넘칠 때

```css
.home-quote-default p {
  overflow-wrap: anywhere;                   /* 띄어쓰기 없어도 줄바꿈 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;                     /* 2줄까지만 */
  overflow: hidden;                          /* 나머지는 … */
}
.rk-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }  /* 한 줄 … */
```
`word-break: keep-all`은 한글을 단어 단위로 줄바꿈해요.

### 아이콘 색 바꾸기 (mask)

```css
.bs-xp i { background: currentColor; mask: center / contain no-repeat; }
```
PNG 모양대로 잘라 내고 배경색을 칠해요. 이미지 색과 상관없이 원하는 색을 쓸 수 있어요.

### 말풍선 꼬리

```css
.tm-bubble::after {
  content: "";
  clip-path: polygon(0 0, 100% 0, 50% 100%);  /* 역삼각형으로 자르기 */
}
```
`::before`, `::after`는 HTML 없이 요소를 하나 더 만드는 방법이에요.

### 좌우 뒤집기

```css
.tm-mole { transform: scaleX(-1); }
```
두더지를 반대 방향으로 돌려요.

### 상태에 따른 모양

```css
.quote-row:hover { ... }         /* 마우스를 올렸을 때 */
.line-input:focus { ... }        /* 입력칸에 들어갔을 때 */
.ev-send-link:disabled { ... }   /* 버튼이 꺼졌을 때 */
.mp-ach.used { ... }             /* 클래스가 둘 다 있을 때 */
.mp-section + .mp-section { ... }/* 바로 뒤에 오는 같은 요소 */
.mp-stage:has(.ei-panel) { ... } /* 그 자식을 가진 요소 */
```

### 그림자와 모서리

```css
box-shadow: 0 2px 10px rgba(240, 190, 180, 0.12);  /* 가로 세로 번짐 색 */
border-radius: 26px;
```

### 넓이가 좁을 때 (`@media`)

```css
@media (max-width: 900px) {
  .ld-feature { grid-template-columns: 1fr; }   /* 한 줄로 쌓기 */
}
```
창이 900px 이하일 때만 적용돼요.

### 밤하늘 배경 (`MyPage.css`)

이미지 없이 `radial-gradient`를 여러 겹 쌓아 별을 그렸어요. 작은 점 네 겹을 다른 크기로 반복하고, 맨 아래에 어두운 그라데이션을 깔았어요. 사진을 넣으면 `.has-image`로 반복을 끄고 `cover`로 채워요.

---

다음: [10장. 고친 점과 남은 일](10-고친점-남은일.md)
